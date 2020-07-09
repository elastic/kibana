/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IUiSettingsClient } from 'kibana/public';
import {
  TimefilterContract,
  TimeRange,
  UI_SETTINGS,
} from '../../../../../../src/plugins/data/public';
import { getBoundsRoundedToInterval, TimeBuckets, TimeRangeBounds } from '../util/time_buckets';
import {
  ExplorerJob,
  OverallSwimlaneData,
  SwimlaneData,
  ViewBySwimLaneData,
} from '../explorer/explorer_utils';
import { OVERALL_LABEL, VIEW_BY_JOB_LABEL } from '../explorer/explorer_constants';
import { MlResultsService } from './results_service';

/**
 * Service for retrieving anomaly swim lanes data.
 */
export class AnomalyTimelineService {
  private timeBuckets: TimeBuckets;
  private _customTimeRange: TimeRange | undefined;

  constructor(
    private timeFilter: TimefilterContract,
    uiSettings: IUiSettingsClient,
    private mlResultsService: MlResultsService
  ) {
    this.timeBuckets = new TimeBuckets({
      'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
    this.timeFilter.enableTimeRangeSelector();
  }

  public setTimeRange(timeRange: TimeRange) {
    this._customTimeRange = timeRange;
  }

  public getSwimlaneBucketInterval(selectedJobs: ExplorerJob[], swimlaneContainerWidth: number) {
    // Bucketing interval should be the maximum of the chart related interval (i.e. time range related)
    // and the max bucket span for the jobs shown in the chart.
    const bounds = this.getTimeBounds();

    if (bounds === undefined) {
      throw new Error('timeRangeSelectorEnabled has to be enabled');
    }

    this.timeBuckets.setInterval('auto');
    this.timeBuckets.setBounds(bounds);

    const intervalSeconds = this.timeBuckets.getInterval().asSeconds();

    // if the swim lane cell widths are too small they will not be visible
    // calculate how many buckets will be drawn before the swim lanes are actually rendered
    // and increase the interval to widen the cells if they're going to be smaller than 8px
    // this has to be done at this stage so all searches use the same interval
    const timerangeSeconds = (bounds.max!.valueOf() - bounds.min!.valueOf()) / 1000;
    const numBuckets = timerangeSeconds / intervalSeconds;
    const cellWidth = Math.floor((swimlaneContainerWidth / numBuckets) * 100) / 100;

    // if the cell width is going to be less than 8px, double the interval
    if (cellWidth < 8) {
      this.timeBuckets.setInterval(intervalSeconds * 2 + 's');
    }

    const maxBucketSpanSeconds = selectedJobs.reduce(
      (memo, job) => Math.max(memo, job.bucketSpanSeconds),
      0
    );
    if (maxBucketSpanSeconds > intervalSeconds) {
      this.timeBuckets.setInterval(maxBucketSpanSeconds + 's');
      this.timeBuckets.setBounds(bounds);
    }

    return this.timeBuckets.getInterval();
  }

  /**
   * Loads overall swim lane data
   * @param selectedJobs
   * @param chartWidth
   */
  public async loadOverallData(
    selectedJobs: ExplorerJob[],
    chartWidth: number
  ): Promise<OverallSwimlaneData> {
    const interval = this.getSwimlaneBucketInterval(selectedJobs, chartWidth);

    if (!selectedJobs || !selectedJobs.length) {
      throw new Error('Explorer jobs collection is required');
    }

    const bounds = this.getTimeBounds();

    // Ensure the search bounds align to the bucketing interval used in the swim lane so
    // that the first and last buckets are complete.
    const searchBounds = getBoundsRoundedToInterval(bounds, interval, false);
    const selectedJobIds = selectedJobs.map((d) => d.id);

    // Load the overall bucket scores by time.
    // Pass the interval in seconds as the swim lane relies on a fixed number of seconds between buckets
    // which wouldn't be the case if e.g. '1M' was used.
    // Pass 'true' when obtaining bucket bounds due to the way the overall_buckets endpoint works
    // to ensure the search is inclusive of end time.
    const overallBucketsBounds = getBoundsRoundedToInterval(bounds, interval, true);
    const resp = await this.mlResultsService.getOverallBucketScores(
      selectedJobIds,
      // Note there is an optimization for when top_n == 1.
      // If top_n > 1, we should test what happens when the request takes long
      // and refactor the loading calls, if necessary, to avoid delays in loading other components.
      1,
      overallBucketsBounds.min.valueOf(),
      overallBucketsBounds.max.valueOf(),
      interval.asSeconds() + 's'
    );
    const overallSwimlaneData = this.processOverallResults(
      resp.results,
      searchBounds,
      interval.asSeconds()
    );

    // eslint-disable-next-line no-console
    console.log('Explorer overall swim lane data set:', overallSwimlaneData);

    return overallSwimlaneData;
  }

  /**
   * Fetches view by swim lane data.
   *
   * @param fieldValues
   * @param bounds
   * @param selectedJobs
   * @param viewBySwimlaneFieldName
   * @param swimlaneLimit
   * @param perPage
   * @param fromPage
   * @param swimlaneContainerWidth
   * @param influencersFilterQuery
   */
  public async loadViewBySwimlane(
    fieldValues: string[],
    bounds: { earliest: number; latest: number },
    selectedJobs: ExplorerJob[],
    viewBySwimlaneFieldName: string,
    swimlaneLimit: number,
    perPage: number,
    fromPage: number,
    swimlaneContainerWidth: number,
    influencersFilterQuery?: any
  ): Promise<SwimlaneData | undefined> {
    const timefilterBounds = this.getTimeBounds();

    if (timefilterBounds === undefined) {
      throw new Error('timeRangeSelectorEnabled has to be enabled');
    }

    const swimlaneBucketInterval = this.getSwimlaneBucketInterval(
      selectedJobs,
      swimlaneContainerWidth
    );

    const searchBounds = getBoundsRoundedToInterval(
      timefilterBounds,
      swimlaneBucketInterval,
      false
    );

    const selectedJobIds = selectedJobs.map((d) => d.id);
    // load scores by influencer/jobId value and time.
    // Pass the interval in seconds as the swim lane relies on a fixed number of seconds between buckets
    // which wouldn't be the case if e.g. '1M' was used.

    const interval = `${swimlaneBucketInterval.asSeconds()}s`;

    let response;
    if (viewBySwimlaneFieldName === VIEW_BY_JOB_LABEL) {
      const jobIds =
        fieldValues !== undefined && fieldValues.length > 0 ? fieldValues : selectedJobIds;
      response = await this.mlResultsService.getScoresByBucket(
        jobIds,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        interval,
        perPage,
        fromPage
      );
    } else {
      response = await this.mlResultsService.getInfluencerValueMaxScoreByTime(
        selectedJobIds,
        viewBySwimlaneFieldName,
        fieldValues,
        searchBounds.min.valueOf(),
        searchBounds.max.valueOf(),
        interval,
        swimlaneLimit,
        perPage,
        fromPage,
        influencersFilterQuery
      );
    }

    if (response === undefined) {
      return;
    }

    const viewBySwimlaneData = this.processViewByResults(
      response.results,
      response.cardinality,
      fieldValues,
      bounds,
      viewBySwimlaneFieldName,
      swimlaneBucketInterval.asSeconds()
    );
    // eslint-disable-next-line no-console
    console.log('Explorer view by swim lane data set:', viewBySwimlaneData);

    return viewBySwimlaneData;
  }

  public async loadViewByTopFieldValuesForSelectedTime(
    earliestMs: number,
    latestMs: number,
    selectedJobs: ExplorerJob[],
    viewBySwimlaneFieldName: string,
    swimlaneLimit: number,
    perPage: number,
    fromPage: number,
    swimlaneContainerWidth: number
  ) {
    const selectedJobIds = selectedJobs.map((d) => d.id);

    // Find the top field values for the selected time, and then load the 'view by'
    // swimlane over the full time range for those specific field values.
    if (viewBySwimlaneFieldName !== VIEW_BY_JOB_LABEL) {
      const resp = await this.mlResultsService.getTopInfluencers(
        selectedJobIds,
        earliestMs,
        latestMs,
        swimlaneLimit,
        perPage,
        fromPage
      );
      if (resp.influencers[viewBySwimlaneFieldName] === undefined) {
        return [];
      }

      const topFieldValues: any[] = [];
      const topInfluencers = resp.influencers[viewBySwimlaneFieldName];
      if (Array.isArray(topInfluencers)) {
        topInfluencers.forEach((influencerData) => {
          if (influencerData.maxAnomalyScore > 0) {
            topFieldValues.push(influencerData.influencerFieldValue);
          }
        });
      }
      return topFieldValues;
    } else {
      const resp = await this.mlResultsService.getScoresByBucket(
        selectedJobIds,
        earliestMs,
        latestMs,
        this.getSwimlaneBucketInterval(selectedJobs, swimlaneContainerWidth).asSeconds() + 's',
        swimlaneLimit
      );
      return Object.keys(resp.results);
    }
  }

  private getTimeBounds(): TimeRangeBounds {
    return this._customTimeRange !== undefined
      ? this.timeFilter.calculateBounds(this._customTimeRange)
      : this.timeFilter.getBounds();
  }

  private processOverallResults(
    scoresByTime: { [timeMs: number]: number },
    searchBounds: Required<TimeRangeBounds>,
    interval: number
  ): OverallSwimlaneData {
    const overallLabel = OVERALL_LABEL;
    const dataset: OverallSwimlaneData = {
      laneLabels: [overallLabel],
      points: [],
      interval,
      earliest: searchBounds.min.valueOf() / 1000,
      latest: searchBounds.max.valueOf() / 1000,
    };

    // Store the earliest and latest times of the data returned by the ES aggregations,
    // These will be used for calculating the earliest and latest times for the swim lane charts.
    Object.entries(scoresByTime).forEach(([timeMs, score]) => {
      const time = +timeMs / 1000;
      dataset.points.push({
        laneLabel: overallLabel,
        time,
        value: score,
      });

      dataset.earliest = Math.min(time, dataset.earliest);
      dataset.latest = Math.max(time + dataset.interval, dataset.latest);
    });

    return dataset;
  }

  private processViewByResults(
    scoresByInfluencerAndTime: Record<string, { [timeMs: number]: number }>,
    cardinality: number,
    sortedLaneValues: string[],
    bounds: any,
    viewBySwimlaneFieldName: string,
    interval: number
  ): OverallSwimlaneData {
    // Processes the scores for the 'view by' swim lane.
    // Sorts the lanes according to the supplied array of lane
    // values in the order in which they should be displayed,
    // or pass an empty array to sort lanes according to max score over all time.
    const dataset: ViewBySwimLaneData = {
      fieldName: viewBySwimlaneFieldName,
      points: [],
      laneLabels: [],
      interval,
      // Set the earliest and latest to be the same as the overall swim lane.
      earliest: bounds.earliest,
      latest: bounds.latest,
      cardinality,
    };

    const maxScoreByLaneLabel: Record<string, number> = {};

    Object.entries(scoresByInfluencerAndTime).forEach(([influencerFieldValue, influencerData]) => {
      dataset.laneLabels.push(influencerFieldValue);
      maxScoreByLaneLabel[influencerFieldValue] = 0;

      Object.entries(influencerData).forEach(([timeMs, anomalyScore]) => {
        const time = +timeMs / 1000;
        dataset.points.push({
          laneLabel: influencerFieldValue,
          time,
          value: anomalyScore,
        });
        maxScoreByLaneLabel[influencerFieldValue] = Math.max(
          maxScoreByLaneLabel[influencerFieldValue],
          anomalyScore
        );
      });
    });

    const sortValuesLength = sortedLaneValues.length;
    if (sortValuesLength === 0) {
      // Sort lanes in descending order of max score.
      // Note the keys in scoresByInfluencerAndTime received from the ES request
      // are not guaranteed to be sorted by score if they can be parsed as numbers
      // (e.g. if viewing by HTTP response code).
      dataset.laneLabels = dataset.laneLabels.sort((a, b) => {
        return maxScoreByLaneLabel[b] - maxScoreByLaneLabel[a];
      });
    } else {
      // Sort lanes according to supplied order
      // e.g. when a cell in the overall swim lane has been selected.
      // Find the index of each lane label from the actual data set,
      // rather than using sortedLaneValues as-is, just in case they differ.
      dataset.laneLabels = dataset.laneLabels.sort((a, b) => {
        let aIndex = sortedLaneValues.indexOf(a);
        let bIndex = sortedLaneValues.indexOf(b);
        aIndex = aIndex > -1 ? aIndex : sortValuesLength;
        bIndex = bIndex > -1 ? bIndex : sortValuesLength;
        return aIndex - bIndex;
      });
    }

    return dataset;
  }
}
