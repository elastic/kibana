/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * utils for Anomaly Explorer.
 */

import { get, union, sortBy, uniq } from 'lodash';
import moment from 'moment-timezone';

import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
} from '../../../common/constants/search';
import { getEntityFieldList } from '../../../common/util/anomaly_utils';
import { extractErrorMessage } from '../../../common/util/errors';
import {
  isSourceDataChartableForDetector,
  isModelPlotChartableForDetector,
  isModelPlotEnabled,
} from '../../../common/util/job_utils';
import { parseInterval } from '../../../common/util/parse_interval';
import { ml } from '../services/ml_api_service';
import { mlJobService } from '../services/job_service';
import { mlResultsService } from '../services/results_service';
import { getTimeBucketsFromCache } from '../util/time_buckets';
import { getTimefilter, getUiSettings } from '../util/dependency_cache';

import {
  MAX_CATEGORY_EXAMPLES,
  MAX_INFLUENCER_FIELD_VALUES,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
import { ANNOTATION_EVENT_USER } from '../../../common/constants/annotations';

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
export function createJobs(jobs) {
  return jobs.map((job) => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return { id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() };
  });
}

export function getClearedSelectedAnomaliesState() {
  return {
    selectedCells: undefined,
    viewByLoadedForTimeFormatted: null,
    swimlaneLimit: undefined,
  };
}

export function getDefaultSwimlaneData() {
  return {
    fieldName: '',
    laneLabels: [],
    points: [],
    interval: 3600,
  };
}

export async function loadFilteredTopInfluencers(
  jobIds,
  earliestMs,
  latestMs,
  records,
  influencers,
  noInfluencersConfigured,
  influencersFilterQuery
) {
  // Filter the Top Influencers list to show just the influencers from
  // the records in the selected time range.
  const recordInfluencersByName = {};

  // Add the specified influencer(s) to ensure they are used in the filter
  // even if their influencer score for the selected time range is zero.
  influencers.forEach((influencer) => {
    const fieldName = influencer.fieldName;
    if (recordInfluencersByName[influencer.fieldName] === undefined) {
      recordInfluencersByName[influencer.fieldName] = [];
    }
    recordInfluencersByName[fieldName].push(influencer.fieldValue);
  });

  // Add the influencers from the top scoring anomalies.
  records.forEach((record) => {
    const influencersByName = record.influencers || [];
    influencersByName.forEach((influencer) => {
      const fieldName = influencer.influencer_field_name;
      const fieldValues = influencer.influencer_field_values;
      if (recordInfluencersByName[fieldName] === undefined) {
        recordInfluencersByName[fieldName] = [];
      }
      recordInfluencersByName[fieldName].push(...fieldValues);
    });
  });

  const uniqValuesByName = {};
  Object.keys(recordInfluencersByName).forEach((fieldName) => {
    const fieldValues = recordInfluencersByName[fieldName];
    uniqValuesByName[fieldName] = uniq(fieldValues);
  });

  const filterInfluencers = [];
  Object.keys(uniqValuesByName).forEach((fieldName) => {
    // Find record influencers with the same field name as the clicked on cell(s).
    const matchingFieldName = influencers.find((influencer) => {
      return influencer.fieldName === fieldName;
    });

    if (matchingFieldName !== undefined) {
      // Filter for the value(s) of the clicked on cell(s).
      filterInfluencers.push(...influencers);
    } else {
      // For other field names, add values from all records.
      uniqValuesByName[fieldName].forEach((fieldValue) => {
        filterInfluencers.push({ fieldName, fieldValue });
      });
    }
  });

  return await loadTopInfluencers(
    jobIds,
    earliestMs,
    latestMs,
    filterInfluencers,
    noInfluencersConfigured,
    influencersFilterQuery
  );
}

export function getInfluencers(selectedJobs = []) {
  const influencers = [];
  selectedJobs.forEach((selectedJob) => {
    const job = mlJobService.getJob(selectedJob.id);
    if (job !== undefined && job.analysis_config && job.analysis_config.influencers) {
      influencers.push(...job.analysis_config.influencers);
    }
  });
  return influencers;
}

export function getDateFormatTz() {
  const uiSettings = getUiSettings();
  // Pass the timezone to the server for use when aggregating anomalies (by day / hour) for the table.
  const tzConfig = uiSettings.get('dateFormat:tz');
  const dateFormatTz = tzConfig !== 'Browser' ? tzConfig : moment.tz.guess();
  return dateFormatTz;
}

export function getFieldsByJob() {
  return mlJobService.jobs.reduce(
    (reducedFieldsByJob, job) => {
      // Add the list of distinct by, over, partition and influencer fields for each job.
      const analysisConfig = job.analysis_config;
      const influencers = analysisConfig.influencers || [];
      const fieldsForJob = (analysisConfig.detectors || [])
        .reduce((reducedfieldsForJob, detector) => {
          if (detector.partition_field_name !== undefined) {
            reducedfieldsForJob.push(detector.partition_field_name);
          }
          if (detector.over_field_name !== undefined) {
            reducedfieldsForJob.push(detector.over_field_name);
          }
          // For jobs with by and over fields, don't add the 'by' field as this
          // field will only be added to the top-level fields for record type results
          // if it also an influencer over the bucket.
          if (detector.by_field_name !== undefined && detector.over_field_name === undefined) {
            reducedfieldsForJob.push(detector.by_field_name);
          }
          return reducedfieldsForJob;
        }, [])
        .concat(influencers);

      reducedFieldsByJob[job.job_id] = uniq(fieldsForJob);
      reducedFieldsByJob['*'] = union(reducedFieldsByJob['*'], reducedFieldsByJob[job.job_id]);
      return reducedFieldsByJob;
    },
    { '*': [] }
  );
}

export function getSelectionTimeRange(selectedCells, interval, bounds) {
  // Returns the time range of the cell(s) currently selected in the swimlane.
  // If no cell(s) are currently selected, returns the dashboard time range.
  let earliestMs = bounds.min.valueOf();
  let latestMs = bounds.max.valueOf();

  if (selectedCells !== undefined && selectedCells.times !== undefined) {
    // time property of the cell data is an array, with the elements being
    // the start times of the first and last cell selected.
    earliestMs =
      selectedCells.times[0] !== undefined ? selectedCells.times[0] * 1000 : bounds.min.valueOf();
    latestMs = bounds.max.valueOf();
    if (selectedCells.times[1] !== undefined) {
      // Subtract 1 ms so search does not include start of next bucket.
      latestMs = selectedCells.times[1] * 1000 - 1;
    }
  }

  return { earliestMs, latestMs };
}

export function getSelectionInfluencers(selectedCells, fieldName) {
  if (
    selectedCells !== undefined &&
    selectedCells.type !== SWIMLANE_TYPE.OVERALL &&
    selectedCells.viewByFieldName !== undefined &&
    selectedCells.viewByFieldName !== VIEW_BY_JOB_LABEL
  ) {
    return selectedCells.lanes.map((laneLabel) => ({ fieldName, fieldValue: laneLabel }));
  }

  return [];
}

export function getSelectionJobIds(selectedCells, selectedJobs) {
  if (
    selectedCells !== undefined &&
    selectedCells.type !== SWIMLANE_TYPE.OVERALL &&
    selectedCells.viewByFieldName !== undefined &&
    selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
  ) {
    return selectedCells.lanes;
  }

  return selectedJobs.map((d) => d.id);
}

export function getSwimlaneBucketInterval(selectedJobs, swimlaneContainerWidth) {
  // Bucketing interval should be the maximum of the chart related interval (i.e. time range related)
  // and the max bucket span for the jobs shown in the chart.
  const timefilter = getTimefilter();
  const bounds = timefilter.getActiveBounds();
  const buckets = getTimeBucketsFromCache();
  buckets.setInterval('auto');
  buckets.setBounds(bounds);

  const intervalSeconds = buckets.getInterval().asSeconds();

  // if the swimlane cell widths are too small they will not be visible
  // calculate how many buckets will be drawn before the swimlanes are actually rendered
  // and increase the interval to widen the cells if they're going to be smaller than 8px
  // this has to be done at this stage so all searches use the same interval
  const timerangeSeconds = (bounds.max.valueOf() - bounds.min.valueOf()) / 1000;
  const numBuckets = parseInt(timerangeSeconds / intervalSeconds);
  const cellWidth = Math.floor((swimlaneContainerWidth / numBuckets) * 100) / 100;

  // if the cell width is going to be less than 8px, double the interval
  if (cellWidth < 8) {
    buckets.setInterval(intervalSeconds * 2 + 's');
  }

  const maxBucketSpanSeconds = selectedJobs.reduce(
    (memo, job) => Math.max(memo, job.bucketSpanSeconds),
    0
  );
  if (maxBucketSpanSeconds > intervalSeconds) {
    buckets.setInterval(maxBucketSpanSeconds + 's');
    buckets.setBounds(bounds);
  }

  return buckets.getInterval();
}

// Obtain the list of 'View by' fields per job and viewBySwimlaneFieldName
export function getViewBySwimlaneOptions({
  currentViewBySwimlaneFieldName,
  filterActive,
  filteredFields,
  isAndOperator,
  selectedCells,
  selectedJobs,
}) {
  const selectedJobIds = selectedJobs.map((d) => d.id);

  // Unique influencers for the selected job(s).
  const viewByOptions = sortBy(
    uniq(
      mlJobService.jobs.reduce((reducedViewByOptions, job) => {
        if (selectedJobIds.some((jobId) => jobId === job.job_id)) {
          return reducedViewByOptions.concat(job.analysis_config.influencers || []);
        }
        return reducedViewByOptions;
      }, [])
    ),
    (fieldName) => fieldName.toLowerCase()
  );

  viewByOptions.push(VIEW_BY_JOB_LABEL);
  let viewBySwimlaneOptions = viewByOptions;

  let viewBySwimlaneFieldName = undefined;

  if (viewBySwimlaneOptions.indexOf(currentViewBySwimlaneFieldName) !== -1) {
    // Set the swimlane viewBy to that stored in the state (URL) if set.
    // This means we reset it to the current state because it was set by the listener
    // on initialization.
    viewBySwimlaneFieldName = currentViewBySwimlaneFieldName;
  } else {
    if (selectedJobIds.length > 1) {
      // If more than one job selected, default to job ID.
      viewBySwimlaneFieldName = VIEW_BY_JOB_LABEL;
    } else if (mlJobService.jobs.length > 0 && selectedJobIds.length > 0) {
      // For a single job, default to the first partition, over,
      // by or influencer field of the first selected job.
      const firstSelectedJob = mlJobService.jobs.find((job) => {
        return job.job_id === selectedJobIds[0];
      });

      const firstJobInfluencers = firstSelectedJob.analysis_config.influencers || [];
      firstSelectedJob.analysis_config.detectors.forEach((detector) => {
        if (
          detector.partition_field_name !== undefined &&
          firstJobInfluencers.indexOf(detector.partition_field_name) !== -1
        ) {
          viewBySwimlaneFieldName = detector.partition_field_name;
          return false;
        }

        if (
          detector.over_field_name !== undefined &&
          firstJobInfluencers.indexOf(detector.over_field_name) !== -1
        ) {
          viewBySwimlaneFieldName = detector.over_field_name;
          return false;
        }

        // For jobs with by and over fields, don't add the 'by' field as this
        // field will only be added to the top-level fields for record type results
        // if it also an influencer over the bucket.
        if (
          detector.by_field_name !== undefined &&
          detector.over_field_name === undefined &&
          firstJobInfluencers.indexOf(detector.by_field_name) !== -1
        ) {
          viewBySwimlaneFieldName = detector.by_field_name;
          return false;
        }
      });

      if (viewBySwimlaneFieldName === undefined) {
        if (firstJobInfluencers.length > 0) {
          viewBySwimlaneFieldName = firstJobInfluencers[0];
        } else {
          // No influencers for first selected job - set to first available option.
          viewBySwimlaneFieldName =
            viewBySwimlaneOptions.length > 0 ? viewBySwimlaneOptions[0] : undefined;
        }
      }
    }
  }

  // filter View by options to relevant filter fields
  // If it's an AND filter only show job Id view by as the rest will have no results
  if (filterActive === true && isAndOperator === true && selectedCells === null) {
    viewBySwimlaneOptions = [VIEW_BY_JOB_LABEL];
  } else if (
    filterActive === true &&
    Array.isArray(viewBySwimlaneOptions) &&
    Array.isArray(filteredFields)
  ) {
    const filteredOptions = viewBySwimlaneOptions.filter((option) => {
      return (
        filteredFields.includes(option) ||
        option === VIEW_BY_JOB_LABEL ||
        (selectedCells && selectedCells.viewByFieldName === option)
      );
    });
    // only replace viewBySwimlaneOptions with filteredOptions if we found a relevant matching field
    if (filteredOptions.length > 1) {
      viewBySwimlaneOptions = filteredOptions;
    }
  }

  return {
    viewBySwimlaneFieldName,
    viewBySwimlaneOptions,
  };
}

export function loadAnnotationsTableData(selectedCells, selectedJobs, interval, bounds) {
  const jobIds =
    selectedCells !== undefined && selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
      ? selectedCells.lanes
      : selectedJobs.map((d) => d.id);
  const timeRange = getSelectionTimeRange(selectedCells, interval, bounds);

  return new Promise((resolve) => {
    ml.annotations
      .getAnnotations$({
        jobIds,
        earliestMs: timeRange.earliestMs,
        latestMs: timeRange.latestMs,
        maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
        fields: [
          {
            field: 'event',
            missing: ANNOTATION_EVENT_USER,
          },
        ],
      })
      .toPromise()
      .then((resp) => {
        if (resp.error !== undefined || resp.annotations === undefined) {
          const errorMessage = extractErrorMessage(resp.error);
          return resolve({
            annotationsData: [],
            aggregations: {},
            error: errorMessage !== '' ? errorMessage : undefined,
          });
        }

        const annotationsData = [];
        jobIds.forEach((jobId) => {
          const jobAnnotations = resp.annotations[jobId];
          if (jobAnnotations !== undefined) {
            annotationsData.push(...jobAnnotations);
          }
        });

        return resolve({
          annotationsData: annotationsData
            .sort((a, b) => {
              return a.timestamp - b.timestamp;
            })
            .map((d, i) => {
              d.key = (i + 1).toString();
              return d;
            }),
          aggregations: resp.aggregations,
        });
      })
      .catch((resp) => {
        const errorMessage = extractErrorMessage(resp);
        return resolve({
          annotationsData: [],
          aggregations: {},
          error: errorMessage !== '' ? errorMessage : undefined,
        });
      });
  });
}

export async function loadAnomaliesTableData(
  selectedCells,
  selectedJobs,
  dateFormatTz,
  interval,
  bounds,
  fieldName,
  tableInterval,
  tableSeverity,
  influencersFilterQuery
) {
  const jobIds = getSelectionJobIds(selectedCells, selectedJobs);
  const influencers = getSelectionInfluencers(selectedCells, fieldName);
  const timeRange = getSelectionTimeRange(selectedCells, interval, bounds);

  return new Promise((resolve, reject) => {
    ml.results
      .getAnomaliesTableData(
        jobIds,
        [],
        influencers,
        tableInterval,
        tableSeverity,
        timeRange.earliestMs,
        timeRange.latestMs,
        dateFormatTz,
        ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
        MAX_CATEGORY_EXAMPLES,
        influencersFilterQuery
      )
      .toPromise()
      .then((resp) => {
        const anomalies = resp.anomalies;
        const detectorsByJob = mlJobService.detectorsByJob;
        anomalies.forEach((anomaly) => {
          // Add a detector property to each anomaly.
          // Default to functionDescription if no description available.
          // TODO - when job_service is moved server_side, move this to server endpoint.
          const jobId = anomaly.jobId;
          const detector = get(detectorsByJob, [jobId, anomaly.detectorIndex]);
          anomaly.detector = get(
            detector,
            ['detector_description'],
            anomaly.source.function_description
          );

          // For detectors with rules, add a property with the rule count.
          if (detector !== undefined && detector.custom_rules !== undefined) {
            anomaly.rulesLength = detector.custom_rules.length;
          }

          // Add properties used for building the links menu.
          // TODO - when job_service is moved server_side, move this to server endpoint.
          const job = mlJobService.getJob(jobId);
          let isChartable = isSourceDataChartableForDetector(job, anomaly.detectorIndex);
          if (
            isChartable === false &&
            isModelPlotChartableForDetector(job, anomaly.detectorIndex)
          ) {
            // Check if model plot is enabled for this job.
            // Need to check the entity fields for the record in case the model plot config has a terms list.
            // If terms is specified, model plot is only stored if both the partition and by fields appear in the list.
            const entityFields = getEntityFieldList(anomaly.source);
            isChartable = isModelPlotEnabled(job, anomaly.detectorIndex, entityFields);
          }

          anomaly.isTimeSeriesViewRecord = isChartable;

          if (mlJobService.customUrlsByJob[jobId] !== undefined) {
            anomaly.customUrls = mlJobService.customUrlsByJob[jobId];
          }
        });

        resolve({
          anomalies,
          interval: resp.interval,
          examplesByJobId: resp.examplesByJobId,
          showViewSeriesLink: true,
          jobIds,
        });
      })
      .catch((resp) => {
        console.log('Explorer - error loading data for anomalies table:', resp);
        reject();
      });
  });
}

// track the request to be able to ignore out of date requests
// and avoid race conditions ending up with the wrong charts.
let requestCount = 0;
export async function loadDataForCharts(
  jobIds,
  earliestMs,
  latestMs,
  influencers = [],
  selectedCells,
  influencersFilterQuery
) {
  return new Promise((resolve) => {
    // Just skip doing the request when this function
    // is called without the minimum required data.
    if (
      selectedCells === undefined &&
      influencers.length === 0 &&
      influencersFilterQuery === undefined
    ) {
      resolve([]);
    }

    const newRequestCount = ++requestCount;
    requestCount = newRequestCount;

    // Load the top anomalies (by record_score) which will be displayed in the charts.
    mlResultsService
      .getRecordsForInfluencer(
        jobIds,
        influencers,
        0,
        earliestMs,
        latestMs,
        500,
        influencersFilterQuery
      )
      .then((resp) => {
        // Ignore this response if it's returned by an out of date promise
        if (newRequestCount < requestCount) {
          resolve([]);
        }

        if (
          (selectedCells !== undefined && Object.keys(selectedCells).length > 0) ||
          influencersFilterQuery !== undefined
        ) {
          resolve(resp.records);
        }

        resolve([]);
      });
  });
}

export async function loadTopInfluencers(
  selectedJobIds,
  earliestMs,
  latestMs,
  influencers = [],
  noInfluencersConfigured,
  influencersFilterQuery
) {
  return new Promise((resolve) => {
    if (noInfluencersConfigured !== true) {
      mlResultsService
        .getTopInfluencers(
          selectedJobIds,
          earliestMs,
          latestMs,
          MAX_INFLUENCER_FIELD_VALUES,
          10,
          1,
          influencers,
          influencersFilterQuery
        )
        .then((resp) => {
          // TODO - sort the influencers keys so that the partition field(s) are first.
          resolve(resp.influencers);
        });
    } else {
      resolve({});
    }
  });
}

// Recommended by MDN for escaping user input to be treated as a literal string within a regular expression
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions
export function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function escapeParens(string) {
  return string.replace(/[()]/g, '\\$&');
}

export function escapeDoubleQuotes(string) {
  return string.replace(/\"/g, '\\$&');
}

export function getQueryPattern(fieldName, fieldValue) {
  const sanitizedFieldName = escapeRegExp(fieldName);
  const sanitizedFieldValue = escapeRegExp(fieldValue);

  return new RegExp(`(${sanitizedFieldName})\\s?:\\s?(")?(${sanitizedFieldValue})(")?`, 'i');
}

export function removeFilterFromQueryString(currentQueryString, fieldName, fieldValue) {
  let newQueryString = '';
  // Remove the passed in fieldName and value from the existing filter
  const queryPattern = getQueryPattern(fieldName, fieldValue);
  newQueryString = currentQueryString.replace(queryPattern, '');
  // match 'and' or 'or' at the start/end of the string
  const endPattern = /\s(and|or)\s*$/gi;
  const startPattern = /^\s*(and|or)\s/gi;
  // If string has a double operator (e.g. tag:thing or or tag:other) remove and replace with the first occurring operator
  const invalidOperatorPattern = /\s+(and|or)\s+(and|or)\s+/gi;
  newQueryString = newQueryString.replace(invalidOperatorPattern, ' $1 ');
  // If string starts/ends with 'and' or 'or' remove that as that is illegal kuery syntax
  newQueryString = newQueryString.replace(endPattern, '');
  newQueryString = newQueryString.replace(startPattern, '');

  return newQueryString;
}
