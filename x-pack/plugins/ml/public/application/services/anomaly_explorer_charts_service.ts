/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Observable, of } from 'rxjs';
import { map as mapObservable } from 'rxjs/operators';
import type { RecordForInfluencer } from './results_service/results_service';
import type { EntityField } from '../../../common/util/anomaly_utils';
import type { CombinedJob } from '../../../common/types/anomaly_detection_jobs';
import type { MlApiServices } from './ml_api_service';
import type { MlResultsService } from './results_service';
import type { TimefilterContract, TimeRange } from '../../../../../../src/plugins/data/public';
import { isPopulatedObject } from '../../../common/util/object_utils';
import {
  ExplorerChartsData,
  getDefaultChartsData,
} from '../explorer/explorer_charts/explorer_charts_container_service';
import type { TimeRangeBounds } from '../util/time_buckets';
import { isDefined } from '../../../common/types/guards';
import type { AppStateSelectedCells } from '../explorer/explorer_utils';
import type { InfluencersFilterQuery } from '../../../common/types/es_client';
import type { SeriesConfigWithMetadata } from '../../../common/types/results';

const MAX_CHARTS_PER_ROW = 4;

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

  public getAnomalyData$(
    jobIds: string[],
    chartsContainerWidth: number,
    selectedEarliestMs: number,
    selectedLatestMs: number,
    influencerFilterQuery?: InfluencersFilterQuery,
    severity = 0,
    maxSeries = DEFAULT_MAX_SERIES_TO_PLOT
  ): Observable<ExplorerChartsData> {
    const optimumPointSpacing = 5;
    const optimumNumPoints = Math.ceil(chartsContainerWidth / optimumPointSpacing);

    const bounds = this.timeFilter.getActiveBounds();
    const boundsMin = bounds?.min ? bounds.min.valueOf() : undefined;
    const boundsMax = bounds?.max ? bounds.max.valueOf() : undefined;

    return this.mlApiServices.results
      .getAnomalyCharts$(
        jobIds,
        [],
        severity,
        selectedEarliestMs,
        selectedLatestMs,
        { min: boundsMin, max: boundsMax },
        maxSeries,
        optimumNumPoints,
        influencerFilterQuery
      )
      .pipe(
        mapObservable((v) => {
          const data = getDefaultChartsData();

          // Calculate the number of charts per row, depending on the width available, to a max of 4.
          const chartsPerRow = Math.min(Math.max(Math.floor(900 / 550), 1), MAX_CHARTS_PER_ROW);

          data.seriesToPlot = v;

          data.chartsPerRow = chartsPerRow;

          return data;
        })
      );
  }
}
