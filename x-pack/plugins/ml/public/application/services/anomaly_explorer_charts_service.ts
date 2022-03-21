/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, find, get, map, reduce, sortBy } from 'lodash';
import { i18n } from '@kbn/i18n';
import { Observable, of } from 'rxjs';
import { catchError, map as mapObservable } from 'rxjs/operators';
import { RecordForInfluencer } from './results_service/results_service';
import {
  isMappableJob,
  isModelPlotChartableForDetector,
  isModelPlotEnabled,
  isSourceDataChartableForDetector,
  mlFunctionToESAggregation,
} from '../../../common/util/job_utils';
import { EntityField, getEntityFieldList } from '../../../common/util/anomaly_utils';
import { CombinedJob, Datafeed, JobId } from '../../../common/types/anomaly_detection_jobs';
import { MlApiServices } from './ml_api_service';
import { SWIM_LANE_LABEL_WIDTH } from '../explorer/swimlane_container';
import { ES_AGGREGATION, ML_JOB_AGGREGATION } from '../../../common/constants/aggregation_types';
import { parseInterval } from '../../../common/util/parse_interval';
import { _DOC_COUNT, DOC_COUNT } from '../../../common/constants/field_types';
import { getChartType, chartLimits } from '../util/chart_utils';
import { CriteriaField, MlResultsService } from './results_service';
import { TimefilterContract, TimeRange } from '../../../../../../src/plugins/data/public';
import { CHART_TYPE, ChartType } from '../explorer/explorer_constants';
import type { ChartRecord } from '../explorer/explorer_utils';
import {
  RecordsForCriteria,
  ResultResponse,
  ScheduledEventsByBucket,
} from './results_service/result_service_rx';
import { isPopulatedObject } from '../../../common/util/object_utils';
import { AnomalyRecordDoc } from '../../../common/types/anomalies';
import {
  ExplorerChartsData,
  getDefaultChartsData,
} from '../explorer/explorer_charts/explorer_charts_container_service';
import { TimeRangeBounds } from '../util/time_buckets';
import { isDefined } from '../../../common/types/guards';
import { AppStateSelectedCells } from '../explorer/explorer_utils';
import { InfluencersFilterQuery } from '../../../common/types/es_client';
import { ExplorerService } from '../explorer/explorer_dashboard_service';
const CHART_MAX_POINTS = 500;
const ANOMALIES_MAX_RESULTS = 500;
const MAX_SCHEDULED_EVENTS = 10; // Max number of scheduled events displayed per bucket.
const ML_TIME_FIELD_NAME = 'timestamp';
const USE_OVERALL_CHART_LIMITS = false;
const MAX_CHARTS_PER_ROW = 4;

interface ChartPoint {
  date: number;
  anomalyScore?: number;
  actual?: number[];
  multiBucketImpact?: number;
  typical?: number[];
  value?: number | null;
  entity?: string;
  byFieldName?: string;
  numberOfCauses?: number;
  scheduledEvents?: any[];
}
interface MetricData extends ResultResponse {
  results: Record<string, number>;
}
interface SeriesConfig {
  jobId: JobId;
  detectorIndex: number;
  metricFunction: ML_JOB_AGGREGATION.LAT_LONG | ES_AGGREGATION | null;
  timeField: string;
  interval: string;
  datafeedConfig: Datafeed;
  summaryCountFieldName?: string;
  metricFieldName?: string;
}

interface InfoTooltip {
  jobId: JobId;
  aggregationInterval?: string;
  chartFunction: string;
  entityFields: EntityField[];
}
export interface SeriesConfigWithMetadata extends SeriesConfig {
  functionDescription?: string;
  bucketSpanSeconds: number;
  detectorLabel?: string;
  fieldName: string;
  entityFields: EntityField[];
  infoTooltip?: InfoTooltip;
  loading?: boolean;
  chartData?: ChartPoint[] | null;
  mapData?: Array<ChartRecord | undefined>;
  plotEarliest?: number;
  plotLatest?: number;
  chartLimits?: { min: number; max: number };
}

export const isSeriesConfigWithMetadata = (arg: unknown): arg is SeriesConfigWithMetadata => {
  return isPopulatedObject(arg, ['bucketSpanSeconds', 'detectorLabel']);
};

interface ChartRange {
  min: number;
  max: number;
}

export const DEFAULT_MAX_SERIES_TO_PLOT = 6;

/**
 * Service for retrieving anomaly explorer charts data.
 */
export class AnomalyExplorerChartsService {
  private _customTimeRange: TimeRange | undefined;

  constructor(
    private timeFilter: TimefilterContract,
    private mlApiServices: MlApiServices,
    private mlResultsService: MlResultsService
  ) {
    this.timeFilter.enableTimeRangeSelector();
  }

  public setTimeRange(timeRange: TimeRange) {
    this._customTimeRange = timeRange;
  }

  public getTimeBounds(): TimeRangeBounds {
    return this._customTimeRange !== undefined
      ? this.timeFilter.calculateBounds(this._customTimeRange)
      : this.timeFilter.getBounds();
  }

  public calculateChartRange(
    seriesConfigs: SeriesConfigWithMetadata[],
    selectedEarliestMs: number,
    selectedLatestMs: number,
    chartWidth: number,
    recordsToPlot: ChartRecord[],
    timeFieldName: string,
    timeFilter: TimefilterContract
  ) {
    let tooManyBuckets = false;
    // Calculate the time range for the charts.
    // Fit in as many points in the available container width plotted at the job bucket span.
    // Look for the chart with the shortest bucket span as this determines
    // the length of the time range that can be plotted.
    const midpointMs = Math.ceil((selectedEarliestMs + selectedLatestMs) / 2);
    const minBucketSpanMs = Math.min.apply(null, map(seriesConfigs, 'bucketSpanSeconds')) * 1000;
    const maxBucketSpanMs = Math.max.apply(null, map(seriesConfigs, 'bucketSpanSeconds')) * 1000;

    const pointsToPlotFullSelection = Math.ceil(
      (selectedLatestMs - selectedEarliestMs) / minBucketSpanMs
    );

    // Optimally space points 5px apart.
    const optimumPointSpacing = 5;
    const optimumNumPoints = chartWidth / optimumPointSpacing;

    // Increase actual number of points if we can't plot the selected range
    // at optimal point spacing.
    const plotPoints = Math.max(optimumNumPoints, pointsToPlotFullSelection);
    const halfPoints = Math.ceil(plotPoints / 2);
    const bounds = timeFilter.getActiveBounds();
    const boundsMin = bounds?.min ? bounds.min.valueOf() : undefined;
    const boundsMax = bounds?.max ? bounds.max.valueOf() : undefined;
    let chartRange: ChartRange = {
      min: boundsMin
        ? Math.max(midpointMs - halfPoints * minBucketSpanMs, boundsMin)
        : midpointMs - halfPoints * minBucketSpanMs,
      max: boundsMax
        ? Math.min(midpointMs + halfPoints * minBucketSpanMs, boundsMax)
        : midpointMs + halfPoints * minBucketSpanMs,
    };

    if (plotPoints > CHART_MAX_POINTS) {
      // For each series being plotted, display the record with the highest score if possible.
      const maxTimeSpan = minBucketSpanMs * CHART_MAX_POINTS;
      let minMs = recordsToPlot[0][timeFieldName];
      let maxMs = recordsToPlot[0][timeFieldName];

      each(recordsToPlot, (record) => {
        const diffMs = maxMs - minMs;
        if (diffMs < maxTimeSpan) {
          const recordTime = record[timeFieldName];
          if (recordTime < minMs) {
            if (maxMs - recordTime <= maxTimeSpan) {
              minMs = recordTime;
            }
          }

          if (recordTime > maxMs) {
            if (recordTime - minMs <= maxTimeSpan) {
              maxMs = recordTime;
            }
          }
        }
      });

      if (maxMs - minMs < maxTimeSpan) {
        // Expand out before and after the span with the highest scoring anomalies,
        // covering as much as the requested time span as possible.
        // Work out if the high scoring region is nearer the start or end of the selected time span.
        const diff = maxTimeSpan - (maxMs - minMs);
        if (minMs - 0.5 * diff <= selectedEarliestMs) {
          minMs = Math.max(selectedEarliestMs, minMs - 0.5 * diff);
          maxMs = minMs + maxTimeSpan;
        } else {
          maxMs = Math.min(selectedLatestMs, maxMs + 0.5 * diff);
          minMs = maxMs - maxTimeSpan;
        }
      }

      chartRange = { min: minMs, max: maxMs };
    }

    // Elasticsearch aggregation returns points at start of bucket,
    // so align the min to the length of the longest bucket,
    // and use the start of the latest selected bucket in the check
    // for too many selected buckets, respecting the max bounds set in the view.
    chartRange.min = Math.floor(chartRange.min / maxBucketSpanMs) * maxBucketSpanMs;
    if (boundsMin !== undefined && chartRange.min < boundsMin) {
      chartRange.min = chartRange.min + maxBucketSpanMs;
    }

    // When used as an embeddable, selectedEarliestMs is the start date on the time picker,
    // which may be earlier than the time of the first point plotted in the chart (as we plot
    // the first full bucket with a start date no earlier than the start).
    const selectedEarliestBucketCeil = boundsMin
      ? Math.ceil(Math.max(selectedEarliestMs, boundsMin) / maxBucketSpanMs) * maxBucketSpanMs
      : Math.ceil(selectedEarliestMs / maxBucketSpanMs) * maxBucketSpanMs;

    const selectedLatestBucketStart = boundsMax
      ? Math.floor(Math.min(selectedLatestMs, boundsMax) / maxBucketSpanMs) * maxBucketSpanMs
      : Math.floor(selectedLatestMs / maxBucketSpanMs) * maxBucketSpanMs;

    if (
      (chartRange.min > selectedEarliestBucketCeil || chartRange.max < selectedLatestBucketStart) &&
      chartRange.max - chartRange.min < selectedLatestBucketStart - selectedEarliestBucketCeil
    ) {
      tooManyBuckets = true;
    }

    return {
      chartRange,
      tooManyBuckets,
    };
  }

  public buildConfigFromDetector(job: CombinedJob, detectorIndex: number) {
    const analysisConfig = job.analysis_config;
    const detector = analysisConfig.detectors[detectorIndex];

    const config: SeriesConfig = {
      jobId: job.job_id,
      detectorIndex,
      metricFunction:
        detector.function === ML_JOB_AGGREGATION.LAT_LONG
          ? ML_JOB_AGGREGATION.LAT_LONG
          : mlFunctionToESAggregation(detector.function),
      timeField: job.data_description.time_field!,
      interval: job.analysis_config.bucket_span,
      datafeedConfig: job.datafeed_config,
      summaryCountFieldName: job.analysis_config.summary_count_field_name,
      metricFieldName: undefined,
    };

    if (detector.field_name !== undefined) {
      config.metricFieldName = detector.field_name;
    }

    // Extra checks if the job config uses a summary count field.
    const summaryCountFieldName = analysisConfig.summary_count_field_name;
    if (
      config.metricFunction === ES_AGGREGATION.COUNT &&
      summaryCountFieldName !== undefined &&
      summaryCountFieldName !== DOC_COUNT &&
      summaryCountFieldName !== _DOC_COUNT
    ) {
      // Check for a detector looking at cardinality (distinct count) using an aggregation.
      // The cardinality field will be in:
      // aggregations/<agg_name>/aggregations/<summaryCountFieldName>/cardinality/field
      // or aggs/<agg_name>/aggs/<summaryCountFieldName>/cardinality/field
      let cardinalityField;
      const topAgg = get(job.datafeed_config, 'aggregations') || get(job.datafeed_config, 'aggs');
      if (topAgg !== undefined && Object.values(topAgg).length > 0) {
        cardinalityField =
          get(Object.values(topAgg)[0], [
            'aggregations',
            summaryCountFieldName,
            ES_AGGREGATION.CARDINALITY,
            'field',
          ]) ||
          get(Object.values(topAgg)[0], [
            'aggs',
            summaryCountFieldName,
            ES_AGGREGATION.CARDINALITY,
            'field',
          ]);
      }
      if (
        (detector.function === ML_JOB_AGGREGATION.NON_ZERO_COUNT ||
          detector.function === ML_JOB_AGGREGATION.LOW_NON_ZERO_COUNT ||
          detector.function === ML_JOB_AGGREGATION.HIGH_NON_ZERO_COUNT ||
          detector.function === ML_JOB_AGGREGATION.COUNT ||
          detector.function === ML_JOB_AGGREGATION.HIGH_COUNT ||
          detector.function === ML_JOB_AGGREGATION.LOW_COUNT) &&
        cardinalityField !== undefined
      ) {
        config.metricFunction = ES_AGGREGATION.CARDINALITY;
        config.metricFieldName = undefined;
      } else {
        // For count detectors using summary_count_field, plot sum(summary_count_field_name)
        config.metricFunction = ES_AGGREGATION.SUM;
        config.metricFieldName = summaryCountFieldName;
      }
    }

    return config;
  }

  public buildConfig(record: ChartRecord, job: CombinedJob): SeriesConfigWithMetadata {
    const detectorIndex = record.detector_index;
    const config: Omit<
      SeriesConfigWithMetadata,
      'bucketSpanSeconds' | 'detectorLabel' | 'fieldName' | 'entityFields' | 'infoTooltip'
    > = {
      ...this.buildConfigFromDetector(job, detectorIndex),
    };

    const fullSeriesConfig: SeriesConfigWithMetadata = {
      bucketSpanSeconds: 0,
      entityFields: [],
      fieldName: '',
      ...config,
    };
    // Add extra properties used by the explorer dashboard charts.
    fullSeriesConfig.functionDescription = record.function_description;

    const parsedBucketSpan = parseInterval(job.analysis_config.bucket_span);
    if (parsedBucketSpan !== null) {
      fullSeriesConfig.bucketSpanSeconds = parsedBucketSpan.asSeconds();
    }

    fullSeriesConfig.detectorLabel = record.function;
    const jobDetectors = job.analysis_config.detectors;
    if (jobDetectors) {
      fullSeriesConfig.detectorLabel = jobDetectors[detectorIndex].detector_description;
    } else {
      if (record.field_name !== undefined) {
        fullSeriesConfig.detectorLabel += ` ${fullSeriesConfig.fieldName}`;
      }
    }

    if (record.field_name !== undefined) {
      fullSeriesConfig.fieldName = record.field_name;
      fullSeriesConfig.metricFieldName = record.field_name;
    }

    // Add the 'entity_fields' i.e. the partition, by, over fields which
    // define the metric series to be plotted.
    fullSeriesConfig.entityFields = getEntityFieldList(record);

    if (record.function === ML_JOB_AGGREGATION.METRIC) {
      fullSeriesConfig.metricFunction = mlFunctionToESAggregation(record.function_description);
    }

    // Build the tooltip data for the chart info icon, showing further details on what is being plotted.
    let functionLabel = `${config.metricFunction}`;
    if (
      fullSeriesConfig.metricFieldName !== undefined &&
      fullSeriesConfig.metricFieldName !== null
    ) {
      functionLabel += ` ${fullSeriesConfig.metricFieldName}`;
    }

    fullSeriesConfig.infoTooltip = {
      jobId: record.job_id,
      aggregationInterval: fullSeriesConfig.interval,
      chartFunction: functionLabel,
      entityFields: fullSeriesConfig.entityFields.map((f) => ({
        fieldName: f.fieldName,
        fieldValue: f.fieldValue,
      })),
    };

    return fullSeriesConfig;
  }

  public async getCombinedJobs(jobIds: string[]): Promise<CombinedJob[]> {
    const combinedResults = await Promise.all(
      // Getting only necessary job config and datafeed config without the stats
      jobIds.map((jobId) => this.mlApiServices.jobs.jobForCloning(jobId))
    );
    return combinedResults
      .filter(isDefined)
      .filter((r) => r.job !== undefined && r.datafeed !== undefined)
      .map(({ job, datafeed }) => ({ ...job, datafeed_config: datafeed } as CombinedJob));
  }

  public loadDataForCharts$(
    jobIds: string[],
    earliestMs: number,
    latestMs: number,
    influencers: EntityField[] = [],
    selectedCells: AppStateSelectedCells | undefined,
    influencersFilterQuery: InfluencersFilterQuery
  ): Observable<RecordForInfluencer[]> {
    if (
      selectedCells === undefined &&
      influencers.length === 0 &&
      influencersFilterQuery === undefined
    ) {
      of([]);
    }

    return this.mlResultsService
      .getRecordsForInfluencer$(
        jobIds,
        influencers,
        0,
        earliestMs,
        latestMs,
        500,
        influencersFilterQuery
      )
      .pipe(
        mapObservable((resp): RecordForInfluencer[] => {
          if (
            (selectedCells !== undefined && Object.keys(selectedCells).length > 0) ||
            influencersFilterQuery !== undefined
          ) {
            return resp.records;
          }

          return [] as RecordForInfluencer[];
        })
      );
  }

  public async getAnomalyData(
    explorerService: ExplorerService | undefined,
    combinedJobRecords: Record<string, CombinedJob>,
    chartsContainerWidth: number,
    anomalyRecords: ChartRecord[] | undefined,
    selectedEarliestMs: number,
    selectedLatestMs: number,
    timefilter: TimefilterContract,
    severity = 0,
    maxSeries = DEFAULT_MAX_SERIES_TO_PLOT
  ): Promise<ExplorerChartsData | void> {
    const data = getDefaultChartsData();

    const containerWith = chartsContainerWidth + SWIM_LANE_LABEL_WIDTH;
    if (anomalyRecords === undefined) return;
    const filteredRecords = anomalyRecords.filter((record) => {
      return Number(record.record_score) >= severity;
    });
    const { records: allSeriesRecords, errors: errorMessages } = this.processRecordsForDisplay(
      combinedJobRecords,
      filteredRecords
    );

    if (!Array.isArray(allSeriesRecords)) return;
    // Calculate the number of charts per row, depending on the width available, to a max of 4.
    let chartsPerRow = Math.min(Math.max(Math.floor(containerWith / 550), 1), MAX_CHARTS_PER_ROW);

    // Expand the chart to full size if there's only one viewable chart
    if (allSeriesRecords.length === 1 || maxSeries === 1) {
      chartsPerRow = 1;
    }

    // Expand the charts to not have blank space in the row if necessary
    if (maxSeries < chartsPerRow) {
      chartsPerRow = maxSeries;
    }

    data.chartsPerRow = chartsPerRow;

    // Build the data configs of the anomalies to be displayed.
    // TODO - implement paging?
    // For now just take first 6 (or 8 if 4 charts per row).
    const maxSeriesToPlot = maxSeries ?? Math.max(chartsPerRow * 2, 6);
    const recordsToPlot = allSeriesRecords.slice(0, maxSeriesToPlot);
    const hasGeoData = recordsToPlot.find(
      (record) => (record.function_description || record.function) === ML_JOB_AGGREGATION.LAT_LONG
    );
    const seriesConfigs = recordsToPlot.map((record) =>
      this.buildConfig(record, combinedJobRecords[record.job_id])
    );
    const seriesConfigsNoGeoData = [];
    // initialize the charts with loading indicators
    data.seriesToPlot = seriesConfigs.map((config) => ({
      ...config,
      loading: true,
      chartData: null,
    }));

    const mapData: SeriesConfigWithMetadata[] = [];

    if (hasGeoData !== undefined) {
      for (let i = 0; i < seriesConfigs.length; i++) {
        const config = seriesConfigs[i];
        let records;
        if (
          (config.detectorLabel !== undefined &&
            config.detectorLabel.includes(ML_JOB_AGGREGATION.LAT_LONG)) ||
          config?.metricFunction === ML_JOB_AGGREGATION.LAT_LONG
        ) {
          if (config.entityFields.length) {
            records = [
              recordsToPlot.find((record) => {
                const entityFieldName = config.entityFields[0].fieldName;
                const entityFieldValue = config.entityFields[0].fieldValue;
                return (record[entityFieldName] && record[entityFieldName][0]) === entityFieldValue;
              }),
            ];
          } else {
            records = recordsToPlot;
          }

          mapData.push({
            ...config,
            loading: false,
            mapData: records,
          });
        } else {
          seriesConfigsNoGeoData.push(config);
        }
      }
    }

    // Calculate the time range of the charts, which is a function of the chart width and max job bucket span.
    data.tooManyBuckets = false;
    const chartWidth = Math.floor(containerWith / chartsPerRow);
    const { chartRange, tooManyBuckets } = this.calculateChartRange(
      seriesConfigs as SeriesConfigWithMetadata[],
      selectedEarliestMs,
      selectedLatestMs,
      chartWidth,
      recordsToPlot,
      data.timeFieldName,
      timefilter
    );
    data.tooManyBuckets = tooManyBuckets;

    if (errorMessages) {
      data.errorMessages = errorMessages;
    }

    // TODO: replace this temporary fix for flickering issue
    // https://github.com/elastic/kibana/issues/97266
    if (explorerService) {
      explorerService.setCharts({ ...data });
    }
    if (seriesConfigs.length === 0) {
      return data;
    }

    function handleError(errorMsg: string, jobId: string): void {
      // Group the jobIds by the type of error message
      if (!data.errorMessages) {
        data.errorMessages = {};
      }

      if (data.errorMessages[errorMsg]) {
        data.errorMessages[errorMsg].add(jobId);
      } else {
        data.errorMessages[errorMsg] = new Set([jobId]);
      }
    }

    // Query 1 - load the raw metric data.
    function getMetricData(
      mlResultsService: MlResultsService,
      config: SeriesConfigWithMetadata,
      range: ChartRange
    ): Promise<MetricData> {
      const { jobId, detectorIndex, entityFields, bucketSpanSeconds } = config;

      const job = combinedJobRecords[jobId];

      // If the job uses aggregation or scripted fields, and if it's a config we don't support
      // use model plot data if model plot is enabled
      // else if source data can be plotted, use that, otherwise model plot will be available.
      const useSourceData = isSourceDataChartableForDetector(job, detectorIndex);
      if (useSourceData === true) {
        const datafeedQuery = get(config, 'datafeedConfig.query', null);
        return mlResultsService
          .getMetricData(
            Array.isArray(config.datafeedConfig.indices)
              ? config.datafeedConfig.indices.join()
              : config.datafeedConfig.indices,
            entityFields,
            datafeedQuery,
            config.metricFunction,
            config.metricFieldName,
            config.summaryCountFieldName,
            config.timeField,
            range.min,
            range.max,
            bucketSpanSeconds * 1000,
            config.datafeedConfig
          )
          .pipe(
            catchError((error) => {
              handleError(
                i18n.translate('xpack.ml.timeSeriesJob.metricDataErrorMessage', {
                  defaultMessage: 'an error occurred while retrieving metric data',
                }),
                job.job_id
              );
              return of({ success: false, results: {}, error });
            })
          )
          .toPromise();
      } else {
        // Extract the partition, by, over fields on which to filter.
        const criteriaFields: CriteriaField[] = [];
        const detector = job.analysis_config.detectors[detectorIndex];
        if (detector.partition_field_name !== undefined) {
          const partitionEntity = find(entityFields, {
            fieldName: detector.partition_field_name,
          });
          if (partitionEntity !== undefined) {
            criteriaFields.push(
              { fieldName: 'partition_field_name', fieldValue: partitionEntity.fieldName },
              { fieldName: 'partition_field_value', fieldValue: partitionEntity.fieldValue }
            );
          }
        }

        if (detector.over_field_name !== undefined) {
          const overEntity = find(entityFields, { fieldName: detector.over_field_name });
          if (overEntity !== undefined) {
            criteriaFields.push(
              { fieldName: 'over_field_name', fieldValue: overEntity.fieldName },
              { fieldName: 'over_field_value', fieldValue: overEntity.fieldValue }
            );
          }
        }

        if (detector.by_field_name !== undefined) {
          const byEntity = find(entityFields, { fieldName: detector.by_field_name });
          if (byEntity !== undefined) {
            criteriaFields.push(
              { fieldName: 'by_field_name', fieldValue: byEntity.fieldName },
              { fieldName: 'by_field_value', fieldValue: byEntity.fieldValue }
            );
          }
        }

        return new Promise((resolve, reject) => {
          const obj = {
            success: true,
            results: {} as Record<string, number>,
          };

          return mlResultsService
            .getModelPlotOutput(
              jobId,
              detectorIndex,
              criteriaFields,
              range.min,
              range.max,
              bucketSpanSeconds * 1000
            )
            .toPromise()
            .then((resp) => {
              // Return data in format required by the explorer charts.
              const results = resp.results;
              Object.keys(results).forEach((time) => {
                obj.results[time] = results[time].actual;
              });
              resolve(obj);
            })
            .catch((error) => {
              handleError(
                i18n.translate('xpack.ml.timeSeriesJob.modelPlotDataErrorMessage', {
                  defaultMessage: 'an error occurred while retrieving model plot data',
                }),
                job.job_id
              );

              reject(error);
            });
        });
      }
    }

    // Query 2 - load the anomalies.
    // Criteria to return the records for this series are the detector_index plus
    // the specific combination of 'entity' fields i.e. the partition / by / over fields.
    function getRecordsForCriteria(
      mlResultsService: MlResultsService,
      config: SeriesConfigWithMetadata,
      range: ChartRange
    ) {
      let criteria: EntityField[] = [];
      criteria.push({ fieldName: 'detector_index', fieldValue: config.detectorIndex });
      criteria = criteria.concat(config.entityFields);
      return mlResultsService
        .getRecordsForCriteria(
          [config.jobId],
          criteria,
          0,
          range.min,
          range.max,
          ANOMALIES_MAX_RESULTS
        )
        .pipe(
          catchError((error) => {
            handleError(
              i18n.translate('xpack.ml.timeSeriesJob.recordsForCriteriaErrorMessage', {
                defaultMessage: 'an error occurred while retrieving anomaly records',
              }),
              config.jobId
            );
            return of({ success: false, records: [], error });
          })
        )
        .toPromise();
    }

    // Query 3 - load any scheduled events for the job.
    function getScheduledEvents(
      mlResultsService: MlResultsService,
      config: SeriesConfigWithMetadata,
      range: ChartRange
    ) {
      // FIXME performs an API call per chart. should perform 1 call for all charts
      return mlResultsService
        .getScheduledEventsByBucket(
          [config.jobId],
          range.min,
          range.max,
          config.bucketSpanSeconds * 1000,
          1,
          MAX_SCHEDULED_EVENTS
        )
        .pipe(
          catchError((error) => {
            handleError(
              i18n.translate('xpack.ml.timeSeriesJob.scheduledEventsByBucketErrorMessage', {
                defaultMessage: 'an error occurred while retrieving scheduled events',
              }),
              config.jobId
            );
            return of({ success: false, events: {}, error });
          })
        )
        .toPromise();
    }

    // Query 4 - load context data distribution
    function getEventDistribution(
      mlResultsService: MlResultsService,
      config: SeriesConfigWithMetadata,
      range: ChartRange
    ) {
      const chartType = getChartType(config);

      let splitField;
      let filterField = null;

      // Define splitField and filterField based on chartType
      if (chartType === CHART_TYPE.EVENT_DISTRIBUTION) {
        splitField = config.entityFields.find((f) => f.fieldType === 'by');
        filterField = config.entityFields.find((f) => f.fieldType === 'partition');
      } else if (chartType === CHART_TYPE.POPULATION_DISTRIBUTION) {
        splitField = config.entityFields.find((f) => f.fieldType === 'over');
        filterField = config.entityFields.find((f) => f.fieldType === 'partition');
      }

      const datafeedQuery = get(config, 'datafeedConfig.query', null);

      return mlResultsService
        .getEventDistributionData(
          Array.isArray(config.datafeedConfig.indices)
            ? config.datafeedConfig.indices.join()
            : config.datafeedConfig.indices,
          splitField,
          filterField,
          datafeedQuery,
          config.metricFunction,
          config.metricFieldName,
          config.timeField,
          range.min,
          range.max,
          config.bucketSpanSeconds * 1000
        )
        .catch((err) => {
          handleError(
            i18n.translate('xpack.ml.timeSeriesJob.eventDistributionDataErrorMessage', {
              defaultMessage: 'an error occurred while retrieving data',
            }),
            config.jobId
          );
        });
    }

    // first load and wait for required data,
    // only after that trigger data processing and page render.
    // TODO - if query returns no results e.g. source data has been deleted,
    // display a message saying 'No data between earliest/latest'.
    const seriesPromises: Array<
      Promise<[MetricData, RecordsForCriteria, ScheduledEventsByBucket, any]>
    > = [];
    // Use seriesConfigs list without geo data config so indices match up after seriesPromises are resolved and we map through the responses
    const seriesConfigsForPromises = hasGeoData ? seriesConfigsNoGeoData : seriesConfigs;
    seriesConfigsForPromises.forEach((seriesConfig) => {
      seriesPromises.push(
        Promise.all([
          getMetricData(this.mlResultsService, seriesConfig, chartRange),
          getRecordsForCriteria(this.mlResultsService, seriesConfig, chartRange),
          getScheduledEvents(this.mlResultsService, seriesConfig, chartRange),
          getEventDistribution(this.mlResultsService, seriesConfig, chartRange),
        ])
      );
    });

    function processChartData(
      response: [MetricData, RecordsForCriteria, ScheduledEventsByBucket, any],
      seriesIndex: number
    ) {
      const metricData = response[0].results;
      const records = response[1].records;
      const jobId = seriesConfigsForPromises[seriesIndex].jobId;
      const scheduledEvents = response[2].events[jobId];
      const eventDistribution = response[3];
      const chartType = getChartType(seriesConfigsForPromises[seriesIndex]);

      // Sort records in ascending time order matching up with chart data
      records.sort((recordA, recordB) => {
        return recordA[ML_TIME_FIELD_NAME] - recordB[ML_TIME_FIELD_NAME];
      });

      // Return dataset in format used by the chart.
      // i.e. array of Objects with keys date (timestamp), value,
      //    plus anomalyScore for points with anomaly markers.
      let chartData: ChartPoint[] = [];
      if (metricData !== undefined) {
        if (records.length > 0) {
          const filterField = records[0].by_field_value || records[0].over_field_value;
          if (eventDistribution.length > 0) {
            chartData = eventDistribution.filter((d: { entity: any }) => d.entity !== filterField);
          }
          map(metricData, (value, time) => {
            // The filtering for rare/event_distribution charts needs to be handled
            // differently because of how the source data is structured.
            // For rare chart values we are only interested wether a value is either `0` or not,
            // `0` acts like a flag in the chart whether to display the dot/marker.
            // All other charts (single metric, population) are metric based and with
            // those a value of `null` acts as the flag to hide a data point.
            if (
              (chartType === CHART_TYPE.EVENT_DISTRIBUTION && value > 0) ||
              (chartType !== CHART_TYPE.EVENT_DISTRIBUTION && value !== null)
            ) {
              chartData.push({
                date: +time,
                value,
                entity: filterField,
              });
            }
          });
        } else {
          chartData = map(metricData, (value, time) => ({
            date: +time,
            value,
          }));
        }
      }

      // Iterate through the anomaly records, adding anomalyScore properties
      // to the chartData entries for anomalous buckets.
      const chartDataForPointSearch = getChartDataForPointSearch(chartData, records[0], chartType);
      each(records, (record) => {
        // Look for a chart point with the same time as the record.
        // If none found, insert a point for anomalies due to a gap in the data.
        const recordTime = record[ML_TIME_FIELD_NAME];
        let chartPoint = findChartPointForTime(chartDataForPointSearch, recordTime);
        if (chartPoint === undefined) {
          chartPoint = { date: recordTime, value: null };
          chartData.push(chartPoint);
        }
        if (chartPoint !== undefined) {
          chartPoint.anomalyScore = record.record_score;

          if (record.actual !== undefined) {
            chartPoint.actual = record.actual;
            chartPoint.typical = record.typical;
          } else {
            const causes = get(record, 'causes', []);
            if (causes.length > 0) {
              chartPoint.byFieldName = record.by_field_name;
              chartPoint.numberOfCauses = causes.length;
              if (causes.length === 1) {
                // If only a single cause, copy actual and typical values to the top level.
                const cause = record.causes[0];
                chartPoint.actual = cause.actual;
                chartPoint.typical = cause.typical;
              }
            }
          }

          if (record.multi_bucket_impact !== undefined) {
            chartPoint.multiBucketImpact = record.multi_bucket_impact;
          }
        }
      });

      // Add a scheduledEvents property to any points in the chart data set
      // which correspond to times of scheduled events for the job.
      if (scheduledEvents !== undefined) {
        each(scheduledEvents, (events, time) => {
          const chartPoint = findChartPointForTime(chartDataForPointSearch, Number(time));
          if (chartPoint !== undefined) {
            // Note if the scheduled event coincides with an absence of the underlying metric data,
            // we don't worry about plotting the event.
            chartPoint.scheduledEvents = events;
          }
        });
      }

      return chartData;
    }

    function getChartDataForPointSearch(
      chartData: ChartPoint[],
      record: AnomalyRecordDoc,
      chartType: ChartType
    ) {
      if (
        chartType === CHART_TYPE.EVENT_DISTRIBUTION ||
        chartType === CHART_TYPE.POPULATION_DISTRIBUTION
      ) {
        return chartData.filter((d) => {
          return d.entity === (record && (record.by_field_value || record.over_field_value));
        });
      }

      return chartData;
    }

    function findChartPointForTime(chartData: ChartPoint[], time: number) {
      return chartData.find((point) => point.date === time);
    }

    return Promise.all(seriesPromises)
      .then((response) => {
        // calculate an overall min/max for all series
        const processedData = response.map(processChartData);
        const allDataPoints = reduce(
          processedData,
          (datapoints, series) => {
            each(series, (d) => datapoints.push(d));
            return datapoints;
          },
          [] as ChartPoint[]
        );
        const overallChartLimits = chartLimits(allDataPoints);

        data.seriesToPlot = response
          // Don't show the charts if there was an issue retrieving metric or anomaly data
          .filter((r) => r[0]?.success === true && r[1]?.success === true)
          .map((d, i) => {
            return {
              ...seriesConfigsForPromises[i],
              loading: false,
              chartData: processedData[i],
              plotEarliest: chartRange.min,
              plotLatest: chartRange.max,
              selectedEarliest: selectedEarliestMs,
              selectedLatest: selectedLatestMs,
              chartLimits: USE_OVERALL_CHART_LIMITS
                ? overallChartLimits
                : chartLimits(processedData[i]),
            };
          });

        if (mapData.length) {
          // push map data in if it's available
          data.seriesToPlot.push(...mapData);
        }

        // TODO: replace this temporary fix for flickering issue
        if (explorerService) {
          explorerService.setCharts({ ...data });
        }

        return Promise.resolve(data);
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }

  public processRecordsForDisplay(
    combinedJobRecords: Record<string, CombinedJob>,
    anomalyRecords: RecordForInfluencer[]
  ): { records: ChartRecord[]; errors: Record<string, Set<string>> | undefined } {
    // Aggregate the anomaly data by detector, and entity (by/over/partition).
    if (anomalyRecords.length === 0) {
      return { records: [], errors: undefined };
    }
    // Aggregate by job, detector, and analysis fields (partition, by, over).
    const aggregatedData: Record<string, any> = {};

    const jobsErrorMessage: Record<string, string> = {};
    each(anomalyRecords, (record) => {
      // Check if we can plot a chart for this record, depending on whether the source data
      // is chartable, and if model plot is enabled for the job.

      const job = combinedJobRecords[record.job_id];

      // if we already know this job has datafeed aggregations we cannot support
      // no need to do more checks
      if (jobsErrorMessage[record.job_id] !== undefined) {
        return;
      }

      let isChartable =
        isSourceDataChartableForDetector(job, record.detector_index) ||
        isMappableJob(job, record.detector_index);

      if (isChartable === false) {
        if (isModelPlotChartableForDetector(job, record.detector_index)) {
          // Check if model plot is enabled for this job.
          // Need to check the entity fields for the record in case the model plot config has a terms list.
          const entityFields = getEntityFieldList(record);
          if (isModelPlotEnabled(job, record.detector_index, entityFields)) {
            isChartable = true;
          } else {
            isChartable = false;
            jobsErrorMessage[record.job_id] = i18n.translate(
              'xpack.ml.timeSeriesJob.sourceDataNotChartableWithDisabledModelPlotMessage',
              {
                defaultMessage:
                  'source data is not viewable for this detector and model plot is disabled',
              }
            );
          }
        } else {
          jobsErrorMessage[record.job_id] = i18n.translate(
            'xpack.ml.timeSeriesJob.sourceDataModelPlotNotChartableMessage',
            {
              defaultMessage: 'both source data and model plot are not chartable for this detector',
            }
          );
        }
      }

      if (isChartable === false) {
        return;
      }
      const jobId = record.job_id;
      if (aggregatedData[jobId] === undefined) {
        aggregatedData[jobId] = {};
      }
      const detectorsForJob = aggregatedData[jobId];

      const detectorIndex = record.detector_index;
      if (detectorsForJob[detectorIndex] === undefined) {
        detectorsForJob[detectorIndex] = {};
      }

      // TODO - work out how best to display results from detectors with just an over field.
      const firstFieldName =
        record.partition_field_name || record.by_field_name || record.over_field_name;
      const firstFieldValue =
        record.partition_field_value || record.by_field_value || record.over_field_value;
      if (firstFieldName !== undefined && firstFieldValue !== undefined) {
        const groupsForDetector = detectorsForJob[detectorIndex];

        if (groupsForDetector[firstFieldName] === undefined) {
          groupsForDetector[firstFieldName] = {};
        }
        const valuesForGroup: Record<string, any> = groupsForDetector[firstFieldName];
        if (valuesForGroup[firstFieldValue] === undefined) {
          valuesForGroup[firstFieldValue] = {};
        }

        const dataForGroupValue = valuesForGroup[firstFieldValue];

        let isSecondSplit = false;
        if (record.partition_field_name !== undefined) {
          const splitFieldName = record.over_field_name || record.by_field_name;
          if (splitFieldName !== undefined) {
            isSecondSplit = true;
          }
        }

        if (isSecondSplit === false) {
          if (dataForGroupValue.maxScoreRecord === undefined) {
            dataForGroupValue.maxScore = record.record_score;
            dataForGroupValue.maxScoreRecord = record;
          } else {
            if (record.record_score > dataForGroupValue.maxScore) {
              dataForGroupValue.maxScore = record.record_score;
              dataForGroupValue.maxScoreRecord = record;
            }
          }
        } else {
          // Aggregate another level for the over or by field.
          const secondFieldName = record.over_field_name || record.by_field_name;
          const secondFieldValue = record.over_field_value || record.by_field_value;

          if (secondFieldName !== undefined && secondFieldValue !== undefined) {
            if (dataForGroupValue[secondFieldName] === undefined) {
              dataForGroupValue[secondFieldName] = {};
            }

            const splitsForGroup = dataForGroupValue[secondFieldName];
            if (splitsForGroup[secondFieldValue] === undefined) {
              splitsForGroup[secondFieldValue] = {};
            }

            const dataForSplitValue = splitsForGroup[secondFieldValue];
            if (dataForSplitValue.maxScoreRecord === undefined) {
              dataForSplitValue.maxScore = record.record_score;
              dataForSplitValue.maxScoreRecord = record;
            } else {
              if (record.record_score > dataForSplitValue.maxScore) {
                dataForSplitValue.maxScore = record.record_score;
                dataForSplitValue.maxScoreRecord = record;
              }
            }
          }
        }
      } else {
        // Detector with no partition or by field.
        const dataForDetector = detectorsForJob[detectorIndex];
        if (dataForDetector.maxScoreRecord === undefined) {
          dataForDetector.maxScore = record.record_score;
          dataForDetector.maxScoreRecord = record;
        } else {
          if (record.record_score > dataForDetector.maxScore) {
            dataForDetector.maxScore = record.record_score;
            dataForDetector.maxScoreRecord = record;
          }
        }
      }
    });

    // Group job id by error message instead of by job:
    const errorMessages: Record<string, Set<string>> | undefined = {};
    Object.keys(jobsErrorMessage).forEach((jobId) => {
      const msg = jobsErrorMessage[jobId];
      if (errorMessages[msg] === undefined) {
        errorMessages[msg] = new Set([jobId]);
      } else {
        errorMessages[msg].add(jobId);
      }
    });
    let recordsForSeries: ChartRecord[] = [];
    // Convert to an array of the records with the highest record_score per unique series.
    each(aggregatedData, (detectorsForJob) => {
      each(detectorsForJob, (groupsForDetector) => {
        if (groupsForDetector.errorMessage !== undefined) {
          recordsForSeries.push(groupsForDetector.errorMessage);
        } else {
          if (groupsForDetector.maxScoreRecord !== undefined) {
            // Detector with no partition / by field.
            recordsForSeries.push(groupsForDetector.maxScoreRecord);
          } else {
            each(groupsForDetector, (valuesForGroup) => {
              each(valuesForGroup, (dataForGroupValue) => {
                if (dataForGroupValue.maxScoreRecord !== undefined) {
                  recordsForSeries.push(dataForGroupValue.maxScoreRecord);
                } else {
                  // Second level of aggregation for partition and by/over.
                  each(dataForGroupValue, (splitsForGroup) => {
                    each(splitsForGroup, (dataForSplitValue) => {
                      recordsForSeries.push(dataForSplitValue.maxScoreRecord);
                    });
                  });
                }
              });
            });
          }
        }
      });
    });
    recordsForSeries = sortBy(recordsForSeries, 'record_score').reverse();

    return { records: recordsForSeries, errors: errorMessages };
  }
}
