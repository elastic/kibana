/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { map as mapObservable } from 'rxjs';
import type { TimeRange } from '@kbn/es-query';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';
import type {
  InfluencersFilterQuery,
  MlEntityField,
  MlRecordForInfluencer,
} from '@kbn/ml-anomaly-utils';
import type { TimeRangeBounds } from '@kbn/ml-time-buckets';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { SeriesConfigWithMetadata } from '../../../common/types/results';

import type { ExplorerChartsData } from '../explorer/explorer_charts/explorer_charts_container_service';
import type { AppStateSelectedCells } from '../explorer/explorer_utils';
import { SWIM_LANE_LABEL_WIDTH } from '../explorer/constants';

import type { MlApiServices } from './ml_api_service';
import type { MlResultsService } from './results_service';

const MAX_CHARTS_PER_ROW = 4;
const OPTIMAL_CHART_WIDTH = 550;

export const isSeriesConfigWithMetadata = (arg: unknown): arg is SeriesConfigWithMetadata => {
  return isPopulatedObject(arg, ['bucketSpanSeconds', 'detectorLabel']);
};

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
    influencers: MlEntityField[] = [],
    selectedCells: AppStateSelectedCells | undefined | null,
    influencersFilterQuery: InfluencersFilterQuery
  ): Observable<MlRecordForInfluencer[]> {
    if (!selectedCells && influencers.length === 0 && influencersFilterQuery === undefined) {
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
        mapObservable((resp): MlRecordForInfluencer[] => {
          if (isPopulatedObject(selectedCells) || influencersFilterQuery !== undefined) {
            return resp.records;
          }

          return [] as MlRecordForInfluencer[];
        })
      );
  }

  public getAnomalyData$(
    jobIds: string[],
    chartsContainerWidth: number,
    selectedEarliestMs: number,
    selectedLatestMs: number,
    influencerFilterQuery?: InfluencersFilterQuery,
    influencers?: MlEntityField[],
    severity = 0,
    maxSeries?: number
  ): Observable<ExplorerChartsData> {
    const bounds = this.getTimeBounds();
    const boundsMin = bounds?.min ? bounds.min.valueOf() : undefined;
    const boundsMax = bounds?.max ? bounds.max.valueOf() : undefined;

    const containerWidth = chartsContainerWidth + SWIM_LANE_LABEL_WIDTH;

    // Calculate the number of charts per row, depending on the width available, to a max of 4.
    let chartsPerRow = Math.min(
      Math.max(Math.floor(containerWidth / OPTIMAL_CHART_WIDTH), 1),
      MAX_CHARTS_PER_ROW
    );

    // Expand the charts to not have blank space in the row if necessary
    if (maxSeries && maxSeries < chartsPerRow) {
      chartsPerRow = maxSeries;
    }

    const chartWidth = Math.floor(containerWidth / chartsPerRow);

    const optimumPointSpacing = 5;
    const optimumNumPoints = Math.ceil(chartWidth / optimumPointSpacing);

    const maxSeriesToPlot = maxSeries ?? Math.max(chartsPerRow * 2, DEFAULT_MAX_SERIES_TO_PLOT);

    return this.mlApiServices.results
      .getAnomalyCharts$(
        jobIds,
        influencers ?? [],
        severity,
        selectedEarliestMs,
        selectedLatestMs,
        { min: boundsMin, max: boundsMax },
        maxSeriesToPlot,
        optimumNumPoints,
        influencerFilterQuery
      )
      .pipe(
        mapObservable((data) => {
          chartsPerRow = Math.min(data.seriesToPlot.length, chartsPerRow);

          data.chartsPerRow = chartsPerRow;

          return data;
        })
      );
  }
}
