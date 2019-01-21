/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * utils for Anomaly Explorer.
 */

import { each, get, union, uniq } from 'lodash';
import { timefilter } from 'ui/timefilter';
import { parseInterval } from 'ui/utils/parse_interval';
import { TimeBuckets } from 'ui/time_buckets';

import { isTimeSeriesViewDetector } from '../../common/util/job_utils';
import { ml } from '../services/ml_api_service';
import { mlJobService } from '../services/job_service';
import { mlResultsService } from 'plugins/ml/services/results_service';
import { mlSelectIntervalService } from '../components/controls/select_interval/select_interval';
import { mlSelectSeverityService } from '../components/controls/select_severity/select_severity';

import {
  MAX_CATEGORY_EXAMPLES,
  MAX_INFLUENCER_FIELD_VALUES,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE
} from '../../common/constants/search';

import { i18n } from '@kbn/i18n';
import chrome from 'ui/chrome';
const mlAnnotationsEnabled = chrome.getInjected('mlAnnotationsEnabled', false);

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
export function createJobs(jobs) {
  return jobs.map(job => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return { id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan.asSeconds() };
  });
}

export function getDefaultViewBySwimlaneData() {
  return {
    fieldName: '',
    laneLabels: [],
    points: [],
    interval: 3600
  };
}

export function mapScopeToProps(scope) {
  return {
    appStateHandler: scope.appStateHandler,
    dateFormatTz: scope.dateFormatTz,
    loading: scope.loading,
    mlJobSelectService: scope.mlJobSelectService,
    noJobsFound: scope.jobs.length === 0,
  };
}

export async function getFilteredTopInfluencers(jobIds, earliestMs, latestMs, records, influencers, noInfluencersConfigured) {
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

  return await loadTopInfluencers(jobIds, earliestMs, latestMs, filterInfluencers, noInfluencersConfigured);
}

export function selectedJobsHaveInfluencers(selectedJobs = []) {
  let hasInfluencers = false;
  selectedJobs.forEach((selectedJob) => {
    const job = mlJobService.getJob(selectedJob.id);
    let influencers = [];
    if (job !== undefined) {
      influencers = job.analysis_config.influencers || [];
    }
    hasInfluencers = hasInfluencers || influencers.length > 0;
  });
  return hasInfluencers;
}

export function getFieldsByJob() {
  return mlJobService.jobs.reduce((reducedFieldsByJob, job) => {
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
  }, { '*': [] });
}

export function getSelectionTimeRange(selectedCells, interval) {
  // Returns the time range of the cell(s) currently selected in the swimlane.
  // If no cell(s) are currently selected, returns the dashboard time range.
  const bounds = timefilter.getActiveBounds();
  let earliestMs = bounds.min.valueOf();
  let latestMs = bounds.max.valueOf();

  if (selectedCells !== null && selectedCells.times !== undefined) {
    // time property of the cell data is an array, with the elements being
    // the start times of the first and last cell selected.
    earliestMs = (selectedCells.times[0] !== undefined) ? selectedCells.times[0] * 1000 : bounds.min.valueOf();
    latestMs = bounds.max.valueOf();
    if (selectedCells.times[1] !== undefined) {
      // Subtract 1 ms so search does not include start of next bucket.
      latestMs = ((selectedCells.times[1] + interval) * 1000) - 1;
    }
  }

  return { earliestMs, latestMs };
}

export function getSelectionInfluencers(selectedCells, fieldName) {
  if (
    selectedCells !== null &&
    selectedCells.fieldName !== undefined &&
    selectedCells.fieldName !== VIEW_BY_JOB_LABEL
  ) {
    return selectedCells.lanes.map(laneLabel => ({ fieldName, fieldValue: laneLabel }));
  }

  return [];
}

export function getSwimlaneBucketInterval(selectedJobs, swimlaneWidth) {
  // Bucketing interval should be the maximum of the chart related interval (i.e. time range related)
  // and the max bucket span for the jobs shown in the chart.
  const bounds = timefilter.getActiveBounds();
  const buckets = new TimeBuckets();
  buckets.setInterval('auto');
  buckets.setBounds(bounds);

  const intervalSeconds = buckets.getInterval().asSeconds();

  // if the swimlane cell widths are too small they will not be visible
  // calculate how many buckets will be drawn before the swimlanes are actually rendered
  // and increase the interval to widen the cells if they're going to be smaller than 8px
  // this has to be done at this stage so all searches use the same interval
  const numBuckets = parseInt(((bounds.max.valueOf() - bounds.min.valueOf()) / 1000) / intervalSeconds);
  const cellWidth = Math.floor(swimlaneWidth / numBuckets);

  // if the cell width is going to be less than 8px, double the interval
  if (cellWidth < 8) {
    buckets.setInterval((intervalSeconds * 2) + 's');
  }

  const maxBucketSpanSeconds = selectedJobs.reduce((memo, job) => Math.max(memo, job.bucketSpanSeconds), 0);
  if (maxBucketSpanSeconds > intervalSeconds) {
    buckets.setInterval(maxBucketSpanSeconds + 's');
    buckets.setBounds(bounds);
  }

  return buckets.getInterval();
}

export function processOverallResults(scoresByTime, searchBounds, selectedJobs, swimlaneWidth) {
  const overallLabel = i18n.translate('xpack.ml.explorer.overallLabel', { defaultMessage: 'Overall' });
  const dataset = {
    laneLabels: [overallLabel],
    points: [],
    interval: getSwimlaneBucketInterval(selectedJobs, swimlaneWidth).asSeconds(),
    earliest: searchBounds.min.valueOf() / 1000,
    latest: searchBounds.max.valueOf() / 1000
  };

  if (Object.keys(scoresByTime).length > 0) {
    // Store the earliest and latest times of the data returned by the ES aggregations,
    // These will be used for calculating the earliest and latest times for the swimlane charts.
    each(scoresByTime, (score, timeMs) => {
      const time = timeMs / 1000;
      dataset.points.push({
        laneLabel: overallLabel,
        time,
        value: score
      });

      dataset.earliest = Math.min(time, dataset.earliest);
      dataset.latest = Math.max((time + dataset.interval), dataset.latest);
    });
  }

  return dataset;
}

export function processViewByResults(
  scoresByInfluencerAndTime,
  sortedLaneValues,
  selectedJobs,
  overallSwimlaneData,
  swimlaneViewByFieldName,
  swimlaneWidth,
) {
  // Processes the scores for the 'view by' swimlane.
  // Sorts the lanes according to the supplied array of lane
  // values in the order in which they should be displayed,
  // or pass an empty array to sort lanes according to max score over all time.
  const dataset = {
    fieldName: swimlaneViewByFieldName,
    points: [],
    interval: getSwimlaneBucketInterval(selectedJobs, swimlaneWidth).asSeconds()
  };

  // Set the earliest and latest to be the same as the overall swimlane.
  dataset.earliest = overallSwimlaneData.earliest;
  dataset.latest = overallSwimlaneData.latest;

  const laneLabels = [];
  const maxScoreByLaneLabel = {};

  each(scoresByInfluencerAndTime, (influencerData, influencerFieldValue) => {
    laneLabels.push(influencerFieldValue);
    maxScoreByLaneLabel[influencerFieldValue] = 0;

    each(influencerData, (anomalyScore, timeMs) => {
      const time = timeMs / 1000;
      dataset.points.push({
        laneLabel: influencerFieldValue,
        time,
        value: anomalyScore
      });
      maxScoreByLaneLabel[influencerFieldValue] =
        Math.max(maxScoreByLaneLabel[influencerFieldValue], anomalyScore);
    });
  });

  const sortValuesLength = sortedLaneValues.length;
  if (sortValuesLength === 0) {
    // Sort lanes in descending order of max score.
    // Note the keys in scoresByInfluencerAndTime received from the ES request
    // are not guaranteed to be sorted by score if they can be parsed as numbers
    // (e.g. if viewing by HTTP response code).
    dataset.laneLabels = laneLabels.sort((a, b) => {
      return maxScoreByLaneLabel[b] - maxScoreByLaneLabel[a];
    });
  } else {
    // Sort lanes according to supplied order
    // e.g. when a cell in the overall swimlane has been selected.
    // Find the index of each lane label from the actual data set,
    // rather than using sortedLaneValues as-is, just in case they differ.
    dataset.laneLabels = laneLabels.sort((a, b) => {
      let aIndex = sortedLaneValues.indexOf(a);
      let bIndex = sortedLaneValues.indexOf(b);
      aIndex = (aIndex > -1) ? aIndex : sortValuesLength;
      bIndex = (bIndex > -1) ? bIndex : sortValuesLength;
      return aIndex - bIndex;
    });
  }

  return dataset;
}

export async function loadAnnotationsTableData(selectedCells, selectedJobs, interval) {
  const jobIds = (selectedCells !== null && selectedCells.fieldName === VIEW_BY_JOB_LABEL) ?
    selectedCells.lanes : selectedJobs.map(d => d.id);
  const timeRange = getSelectionTimeRange(selectedCells, interval);

  if (mlAnnotationsEnabled === false) {
    return Promise.resolve([]);
  }

  const resp = await ml.annotations.getAnnotations({
    jobIds,
    earliestMs: timeRange.earliestMs,
    latestMs: timeRange.latestMs,
    maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE
  });

  const annotationsData = [];
  jobIds.forEach((jobId) => {
    const jobAnnotations = resp.annotations[jobId];
    if (jobAnnotations !== undefined) {
      annotationsData.push(...jobAnnotations);
    }
  });

  return Promise.resolve(
    annotationsData
      .sort((a, b) => {
        return a.timestamp - b.timestamp;
      })
      .map((d, i) => {
        d.key = String.fromCharCode(65 + i);
        return d;
      })
  );
}

export async function loadAnomaliesTableData(selectedCells, selectedJobs, dateFormatTz, interval, fieldName) {
  const jobIds = (selectedCells !== null && selectedCells.fieldName === VIEW_BY_JOB_LABEL) ?
    selectedCells.lanes : selectedJobs.map(d => d.id);
  const influencers = getSelectionInfluencers(selectedCells, fieldName);
  const timeRange = getSelectionTimeRange(selectedCells, interval);

  return new Promise((resolve, reject) => {
    ml.results.getAnomaliesTableData(
      jobIds,
      [],
      influencers,
      mlSelectIntervalService.state.get('interval').val,
      mlSelectSeverityService.state.get('threshold').val,
      timeRange.earliestMs,
      timeRange.latestMs,
      dateFormatTz,
      ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
      MAX_CATEGORY_EXAMPLES
    ).then((resp) => {
      const anomalies = resp.anomalies;
      const detectorsByJob = mlJobService.detectorsByJob;
      anomalies.forEach((anomaly) => {
        // Add a detector property to each anomaly.
        // Default to functionDescription if no description available.
        // TODO - when job_service is moved server_side, move this to server endpoint.
        const jobId = anomaly.jobId;
        const detector = get(detectorsByJob, [jobId, anomaly.detectorIndex]);
        anomaly.detector = get(detector,
          ['detector_description'],
          anomaly.source.function_description);

        // For detectors with rules, add a property with the rule count.
        if (detector !== undefined && detector.custom_rules !== undefined) {
          anomaly.rulesLength = detector.custom_rules.length;
        }

        // Add properties used for building the links menu.
        // TODO - when job_service is moved server_side, move this to server endpoint.
        anomaly.isTimeSeriesViewDetector = isTimeSeriesViewDetector(mlJobService.getJob(jobId), anomaly.detectorIndex);
        if (mlJobService.customUrlsByJob[jobId] !== undefined) {
          anomaly.customUrls = mlJobService.customUrlsByJob[jobId];
        }
      });

      resolve({
        anomalies,
        interval: resp.interval,
        examplesByJobId: resp.examplesByJobId,
        showViewSeriesLink: true,
        jobIds
      });
    }).catch((resp) => {
      console.log('Explorer - error loading data for anomalies table:', resp);
      reject();
    });
  });
}

// track the request to be able to ignore out of date requests
// and avoid race conditions ending up with the wrong charts.
let requestCount = 0;
export async function loadDataForCharts(jobIds, earliestMs, latestMs, influencers = [], selectedCells) {
  return new Promise((resolve) => {
    // Just skip doing the request when this function
    // is called without the minimum required data.
    if (selectedCells === null && influencers.length === 0) {
      resolve([]);
    }

    const newRequestCount = ++requestCount;
    requestCount = newRequestCount;

    // Load the top anomalies (by record_score) which will be displayed in the charts.
    mlResultsService.getRecordsForInfluencer(
      jobIds, influencers, 0, earliestMs, latestMs, 500
    )
      .then((resp) => {
        // Ignore this response if it's returned by an out of date promise
        if (newRequestCount < requestCount) {
          resolve(undefined);
        }

        if (selectedCells !== null && Object.keys(selectedCells).length > 0) {
          console.log('Explorer anomaly charts data set:', resp.records);
          resolve(resp.records);
        }

        resolve(undefined);
      });
  });
}

export async function loadTopInfluencers(selectedJobIds, earliestMs, latestMs, influencers = [], noInfluencersConfigured) {
  return new Promise((resolve) => {
    if (noInfluencersConfigured !== true) {
      mlResultsService.getTopInfluencers(
        selectedJobIds,
        earliestMs,
        latestMs,
        MAX_INFLUENCER_FIELD_VALUES,
        influencers
      ).then((resp) => {
        // TODO - sort the influencers keys so that the partition field(s) are first.
        console.log('Explorer top influencers data set:', resp.influencers);
        resolve(resp.influencers);
      });
    } else {
      resolve({});
    }
  });
}
