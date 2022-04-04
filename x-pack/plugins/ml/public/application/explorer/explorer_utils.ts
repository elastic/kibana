/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * utils for Anomaly Explorer.
 */

import { get, union, uniq } from 'lodash';
import moment from 'moment-timezone';

import {
  ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
  ANOMALIES_TABLE_DEFAULT_QUERY_SIZE,
} from '../../../common/constants/search';
import { EntityField, getEntityFieldList } from '../../../common/util/anomaly_utils';
import { extractErrorMessage } from '../../../common/util/errors';
import {
  isSourceDataChartableForDetector,
  isModelPlotChartableForDetector,
  isModelPlotEnabled,
} from '../../../common/util/job_utils';
import { parseInterval } from '../../../common/util/parse_interval';
import { ml } from '../services/ml_api_service';
import { mlJobService } from '../services/job_service';
import { getUiSettings } from '../util/dependency_cache';

import {
  MAX_CATEGORY_EXAMPLES,
  MAX_INFLUENCER_FIELD_VALUES,
  SWIMLANE_TYPE,
  SwimlaneType,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import { MlResultsService } from '../services/results_service';
import { InfluencersFilterQuery } from '../../../common/types/es_client';
import { TimeRangeBounds } from '../util/time_buckets';
import { Annotations, AnnotationsTable } from '../../../common/types/annotations';
import { Influencer } from '../../../common/types/anomalies';
import { RecordForInfluencer } from '../services/results_service/results_service';

export interface ExplorerJob {
  id: string;
  selected: boolean;
  bucketSpanSeconds: number;
}

interface ClearedSelectedAnomaliesState {
  selectedCells: undefined;
}

export interface SwimlanePoint {
  laneLabel: string;
  time: number;
  value: number;
}

export interface SwimlaneData {
  fieldName?: string;
  laneLabels: string[];
  points: SwimlanePoint[];
  interval: number;
}

export interface AppStateSelectedCells {
  type: SwimlaneType;
  lanes: string[];
  times: [number, number];
  showTopFieldValues?: boolean;
  viewByFieldName?: string;
}

interface SelectionTimeRange {
  earliestMs: number;
  latestMs: number;
}

export interface AnomaliesTableData {
  anomalies: any[];
  interval: number;
  examplesByJobId: string[];
  showViewSeriesLink: boolean;
  jobIds: string[];
}

export interface ChartRecord extends RecordForInfluencer {
  function: string;
}

export interface OverallSwimlaneData extends SwimlaneData {
  /**
   * Earliest timestamp in seconds
   */
  earliest: number;
  /**
   * Latest timestamp in seconds
   */
  latest: number;
}

export interface ViewBySwimLaneData extends OverallSwimlaneData {
  cardinality: number;
}

// create new job objects based on standard job config objects
// new job objects just contain job id, bucket span in seconds and a selected flag.
export function createJobs(jobs: CombinedJob[]): ExplorerJob[] {
  return jobs.map((job) => {
    const bucketSpan = parseInterval(job.analysis_config.bucket_span);
    return { id: job.job_id, selected: false, bucketSpanSeconds: bucketSpan!.asSeconds() };
  });
}

export function getClearedSelectedAnomaliesState(): ClearedSelectedAnomaliesState {
  return {
    selectedCells: undefined,
  };
}

export function getDefaultSwimlaneData(): SwimlaneData {
  return {
    fieldName: '',
    laneLabels: [],
    points: [],
    interval: 3600,
  };
}

export async function loadFilteredTopInfluencers(
  mlResultsService: MlResultsService,
  jobIds: string[],
  earliestMs: number,
  latestMs: number,
  records: any[],
  influencers: any[],
  noInfluencersConfigured: boolean,
  influencersFilterQuery: InfluencersFilterQuery
): Promise<any[]> {
  // Filter the Top Influencers list to show just the influencers from
  // the records in the selected time range.
  const recordInfluencersByName: Record<string, any[]> = {};

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
    const influencersByName: Influencer[] = record.influencers || [];
    influencersByName.forEach((influencer) => {
      const fieldName = influencer.influencer_field_name;
      const fieldValues = influencer.influencer_field_values;
      if (recordInfluencersByName[fieldName] === undefined) {
        recordInfluencersByName[fieldName] = [];
      }
      recordInfluencersByName[fieldName].push(...fieldValues);
    });
  });

  const uniqValuesByName: Record<string, any[]> = {};
  Object.keys(recordInfluencersByName).forEach((fieldName) => {
    const fieldValues = recordInfluencersByName[fieldName];
    uniqValuesByName[fieldName] = uniq(fieldValues);
  });

  const filterInfluencers: EntityField[] = [];
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

  return (await loadTopInfluencers(
    mlResultsService,
    jobIds,
    earliestMs,
    latestMs,
    filterInfluencers,
    noInfluencersConfigured,
    influencersFilterQuery
  )) as any[];
}

export function getInfluencers(selectedJobs: any[]): string[] {
  const influencers: string[] = [];
  selectedJobs.forEach((selectedJob) => {
    const job = mlJobService.getJob(selectedJob.id);
    if (job !== undefined && job.analysis_config && job.analysis_config.influencers) {
      influencers.push(...job.analysis_config.influencers);
    }
  });
  return influencers;
}

export function getDateFormatTz(): string {
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
        }, [] as string[])
        .concat(influencers);

      reducedFieldsByJob[job.job_id] = uniq(fieldsForJob);
      reducedFieldsByJob['*'] = union(reducedFieldsByJob['*'], reducedFieldsByJob[job.job_id]);
      return reducedFieldsByJob;
    },
    { '*': [] } as Record<string, string[]>
  );
}

export function getSelectionTimeRange(
  selectedCells: AppStateSelectedCells | undefined | null,
  bounds: TimeRangeBounds
): SelectionTimeRange {
  // Returns the time range of the cell(s) currently selected in the swimlane.
  // If no cell(s) are currently selected, returns the dashboard time range.

  // TODO check why this code always expect both min and max defined.
  const requiredBounds = bounds as Required<TimeRangeBounds>;

  let earliestMs = requiredBounds.min.valueOf();
  let latestMs = requiredBounds.max.valueOf();

  if (selectedCells?.times !== undefined) {
    // time property of the cell data is an array, with the elements being
    // the start times of the first and last cell selected.
    earliestMs =
      selectedCells.times[0] !== undefined
        ? selectedCells.times[0] * 1000
        : requiredBounds.min.valueOf();
    latestMs = requiredBounds.max.valueOf();
    if (selectedCells.times[1] !== undefined) {
      // Subtract 1 ms so search does not include start of next bucket.
      latestMs = selectedCells.times[1] * 1000 - 1;
    }
  }

  return { earliestMs, latestMs };
}

export function getSelectionInfluencers(
  selectedCells: AppStateSelectedCells | undefined | null,
  fieldName: string
): EntityField[] {
  if (
    !!selectedCells &&
    selectedCells.type !== SWIMLANE_TYPE.OVERALL &&
    selectedCells.viewByFieldName !== undefined &&
    selectedCells.viewByFieldName !== VIEW_BY_JOB_LABEL
  ) {
    return selectedCells.lanes.map((laneLabel) => ({ fieldName, fieldValue: laneLabel }));
  }

  return [];
}

export function getSelectionJobIds(
  selectedCells: AppStateSelectedCells | undefined | null,
  selectedJobs: ExplorerJob[]
): string[] {
  if (
    !!selectedCells &&
    selectedCells.type !== SWIMLANE_TYPE.OVERALL &&
    selectedCells.viewByFieldName !== undefined &&
    selectedCells.viewByFieldName === VIEW_BY_JOB_LABEL
  ) {
    return selectedCells.lanes;
  }

  return selectedJobs.map((d) => d.id);
}

export function loadOverallAnnotations(
  selectedJobs: ExplorerJob[],
  bounds: TimeRangeBounds
): Promise<AnnotationsTable> {
  const jobIds = selectedJobs.map((d) => d.id);
  const timeRange = getSelectionTimeRange(undefined, bounds);

  return new Promise((resolve) => {
    ml.annotations
      .getAnnotations$({
        jobIds,
        earliestMs: timeRange.earliestMs,
        latestMs: timeRange.latestMs,
        maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
      })
      .toPromise()
      .then((resp) => {
        if (resp.error !== undefined || resp.annotations === undefined) {
          const errorMessage = extractErrorMessage(resp.error);
          return resolve({
            annotationsData: [],
            error: errorMessage !== '' ? errorMessage : undefined,
          });
        }

        const annotationsData: Annotations = [];
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
        });
      })
      .catch((resp) => {
        const errorMessage = extractErrorMessage(resp);
        return resolve({
          annotationsData: [],
          error: errorMessage !== '' ? errorMessage : undefined,
        });
      });
  });
}

export function loadAnnotationsTableData(
  selectedCells: AppStateSelectedCells | undefined | null,
  selectedJobs: ExplorerJob[],
  bounds: Required<TimeRangeBounds>
): Promise<AnnotationsTable> {
  const jobIds = getSelectionJobIds(selectedCells, selectedJobs);
  const timeRange = getSelectionTimeRange(selectedCells, bounds);

  return new Promise((resolve) => {
    ml.annotations
      .getAnnotations$({
        jobIds,
        earliestMs: timeRange.earliestMs,
        latestMs: timeRange.latestMs,
        maxAnnotations: ANNOTATIONS_TABLE_DEFAULT_QUERY_SIZE,
      })
      .toPromise()
      .then((resp) => {
        if (resp.error !== undefined || resp.annotations === undefined) {
          const errorMessage = extractErrorMessage(resp.error);
          return resolve({
            annotationsData: [],
            totalCount: 0,
            error: errorMessage !== '' ? errorMessage : undefined,
          });
        }

        const annotationsData: Annotations = [];
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
          totalCount: resp.totalCount,
        });
      })
      .catch((resp) => {
        const errorMessage = extractErrorMessage(resp);
        return resolve({
          annotationsData: [],
          totalCount: 0,
          error: errorMessage !== '' ? errorMessage : undefined,
        });
      });
  });
}

export async function loadAnomaliesTableData(
  selectedCells: AppStateSelectedCells | undefined | null,
  selectedJobs: ExplorerJob[],
  dateFormatTz: string,
  bounds: Required<TimeRangeBounds>,
  fieldName: string,
  tableInterval: string,
  tableSeverity: number,
  influencersFilterQuery: InfluencersFilterQuery
): Promise<AnomaliesTableData> {
  const jobIds = getSelectionJobIds(selectedCells, selectedJobs);
  const influencers = getSelectionInfluencers(selectedCells, fieldName);
  const timeRange = getSelectionTimeRange(selectedCells, bounds);

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
        // @ts-ignore
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
        // eslint-disable-next-line no-console
        console.log('Explorer - error loading data for anomalies table:', resp);
        reject();
      });
  });
}

export async function loadTopInfluencers(
  mlResultsService: MlResultsService,
  selectedJobIds: string[],
  earliestMs: number,
  latestMs: number,
  influencers: any[],
  noInfluencersConfigured?: boolean,
  influencersFilterQuery?: InfluencersFilterQuery
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
export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

export function escapeParens(string: string): string {
  return string.replace(/[()]/g, '\\$&');
}

export function escapeDoubleQuotes(string: string): string {
  return string.replace(/[\\"]/g, '\\$&');
}

export function getQueryPattern(fieldName: string, fieldValue: string) {
  const sanitizedFieldName = escapeRegExp(fieldName);
  const sanitizedFieldValue = escapeRegExp(fieldValue);

  return new RegExp(`(${sanitizedFieldName})\\s?:\\s?(")?(${sanitizedFieldValue})(")?`, 'i');
}

export function removeFilterFromQueryString(
  currentQueryString: string,
  fieldName: string,
  fieldValue: string
) {
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
