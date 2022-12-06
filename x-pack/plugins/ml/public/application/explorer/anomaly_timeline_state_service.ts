/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, from, Observable, of, Subscription } from 'rxjs';
import {
  switchMap,
  map,
  skipWhile,
  distinctUntilChanged,
  startWith,
  tap,
  debounceTime,
  filter,
} from 'rxjs/operators';
import { isEqual, sortBy, uniq } from 'lodash';
import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRangeBounds } from '@kbn/data-plugin/common';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import type {
  AppStateSelectedCells,
  ExplorerJob,
  OverallSwimlaneData,
  ViewBySwimLaneData,
} from './explorer_utils';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyExplorerSwimLaneUrlState } from '../../../common/types/locator';
import {
  ANOMALY_SWIM_LANE_HARD_LIMIT,
  SWIMLANE_TYPE,
  VIEW_BY_JOB_LABEL,
} from './explorer_constants';
// FIXME get rid of the static import
import { mlJobService } from '../services/job_service';
import { getSelectionInfluencers, getSelectionTimeRange } from './explorer_utils';
import type { TimeBucketsInterval } from '../util/time_buckets';
import { InfluencersFilterQuery } from '../../../common/types/es_client';
// FIXME get rid of the static import
import { mlTimefilterRefresh$ } from '../services/timefilter_refresh_service';
import type { Refresh } from '../routing/use_refresh';
import { StateService } from '../services/state_service';
import type { AnomalyExplorerUrlStateService } from './hooks/use_explorer_url_state';

interface SwimLanePagination {
  viewByFromPage: number;
  viewByPerPage: number;
}

/**
 * Service for managing anomaly timeline state.
 */
export class AnomalyTimelineStateService extends StateService {
  // TODO: Add services for getSelectionInfluencers, getSelectionJobIds, & getSelectionTimeRange
  // to consolidate usage
  private readonly _explorerURLStateCallback: (
    update: AnomalyExplorerSwimLaneUrlState,
    replaceState?: boolean
  ) => void;

  private _overallSwimLaneData$ = new BehaviorSubject<OverallSwimlaneData | null>(null);
  private _viewBySwimLaneData$ = new BehaviorSubject<ViewBySwimLaneData | undefined>(undefined);

  private _swimLaneUrlState$ = new BehaviorSubject<
    AnomalyExplorerSwimLaneUrlState | undefined | null
  >(null);

  private _containerWidth$ = new BehaviorSubject<number>(0);
  private _selectedCells$ = new BehaviorSubject<AppStateSelectedCells | undefined | null>(
    undefined
  );
  private _swimLaneSeverity$ = new BehaviorSubject<number>(0);
  private _swimLanePagination$ = new BehaviorSubject<SwimLanePagination>({
    viewByFromPage: 1,
    viewByPerPage: 10,
  });
  private _swimLaneCardinality$ = new BehaviorSubject<number | undefined>(undefined);
  private _viewBySwimlaneFieldName$ = new BehaviorSubject<string | undefined>(undefined);
  private _viewBySwimLaneOptions$ = new BehaviorSubject<string[]>([]);
  private _topFieldValues$ = new BehaviorSubject<string[]>([]);
  private _isOverallSwimLaneLoading$ = new BehaviorSubject(true);
  private _isViewBySwimLaneLoading$ = new BehaviorSubject(true);
  private _swimLaneBucketInterval$ = new BehaviorSubject<TimeBucketsInterval | null>(null);

  private _timeBounds$: Observable<TimeRangeBounds>;
  private _refreshSubject$: Observable<Refresh>;

  constructor(
    private anomalyExplorerUrlStateService: AnomalyExplorerUrlStateService,
    private anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService,
    private anomalyTimelineService: AnomalyTimelineService,
    private timefilter: TimefilterContract
  ) {
    super();

    this._timeBounds$ = this.timefilter.getTimeUpdate$().pipe(
      startWith(null),
      map(() => this.timefilter.getBounds())
    );
    this._refreshSubject$ = mlTimefilterRefresh$.pipe(startWith({ lastRefresh: 0 }));

    this._explorerURLStateCallback = (
      update: AnomalyExplorerSwimLaneUrlState,
      replaceState?: boolean
    ) => {
      const explorerUrlState = this.anomalyExplorerUrlStateService.getPageUrlState();
      const mlExplorerSwimLaneState = explorerUrlState?.mlExplorerSwimlane;
      const resultUpdate = replaceState ? update : { ...mlExplorerSwimLaneState, ...update };
      return this.anomalyExplorerUrlStateService.updateUrlState({
        ...explorerUrlState,
        mlExplorerSwimlane: resultUpdate,
      });
    };

    this._init();
  }

  /**
   * Initializes required subscriptions for fetching swim lanes data.
   * @private
   */
  protected _initSubscriptions(): Subscription {
    const subscription = new Subscription();

    subscription.add(
      this.anomalyExplorerUrlStateService
        .getPageUrlState$()
        .pipe(
          map((v) => v?.mlExplorerSwimlane),
          distinctUntilChanged(isEqual)
        )
        .subscribe(this._swimLaneUrlState$)
    );

    subscription.add(this._initViewByData());

    subscription.add(
      this._swimLaneUrlState$
        .pipe(
          map((v) => v?.severity ?? 0),
          distinctUntilChanged()
        )
        .subscribe(this._swimLaneSeverity$)
    );

    subscription.add(this._initSwimLanePagination());
    subscription.add(this._initOverallSwimLaneData());
    subscription.add(this._initTopFieldValues());
    subscription.add(this._initViewBySwimLaneData());

    subscription.add(
      combineLatest([
        this.anomalyExplorerCommonStateService.getSelectedJobs$(),
        this.getContainerWidth$(),
        this._timeBounds$,
      ]).subscribe(([selectedJobs, containerWidth]) => {
        this._swimLaneBucketInterval$.next(
          this.anomalyTimelineService.getSwimlaneBucketInterval(selectedJobs, containerWidth!)
        );
      })
    );

    subscription.add(this._initSelectedCells());

    return subscription;
  }

  private _initViewByData(): Subscription {
    return combineLatest([
      this._swimLaneUrlState$.pipe(
        map((v) => v?.viewByFieldName),
        distinctUntilChanged()
      ),
      this.anomalyExplorerCommonStateService.getSelectedJobs$(),
      this.anomalyExplorerCommonStateService.getFilterSettings$(),
      this._selectedCells$,
    ]).subscribe(([currentlySelected, selectedJobs, filterSettings, selectedCells]) => {
      const { viewBySwimlaneFieldName, viewBySwimlaneOptions } = this._getViewBySwimlaneOptions(
        currentlySelected,
        filterSettings.filterActive,
        filterSettings.filteredFields as string[],
        false,
        selectedCells,
        selectedJobs
      );
      this._viewBySwimlaneFieldName$.next(viewBySwimlaneFieldName);
      this._viewBySwimLaneOptions$.next(viewBySwimlaneOptions);
    });
  }

  private _initSwimLanePagination() {
    return combineLatest([
      this._swimLaneUrlState$.pipe(
        map((v) => {
          return {
            viewByFromPage: v?.viewByFromPage ?? 1,
            viewByPerPage: v?.viewByPerPage ?? 10,
          };
        }),
        distinctUntilChanged(isEqual)
      ),
      this.anomalyExplorerCommonStateService.getInfluencerFilterQuery$(),
      this._timeBounds$,
    ]).subscribe(([pagination, influencersFilerQuery]) => {
      let resultPaginaiton: SwimLanePagination = pagination;
      if (influencersFilerQuery) {
        resultPaginaiton = { viewByPerPage: pagination.viewByPerPage, viewByFromPage: 1 };
      }
      this._swimLanePagination$.next(resultPaginaiton);
    });
  }

  private _initOverallSwimLaneData() {
    return combineLatest([
      this.anomalyExplorerCommonStateService.getSelectedJobs$(),
      this._swimLaneSeverity$,
      this.getSwimLaneBucketInterval$(),
      this._timeBounds$,
      this._refreshSubject$,
    ])
      .pipe(
        tap(() => {
          this._isOverallSwimLaneLoading$.next(true);
        }),
        switchMap(([selectedJobs, severity, bucketInterval]) => {
          return from(
            this.anomalyTimelineService.loadOverallData(
              selectedJobs,
              undefined,
              bucketInterval!,
              severity
            )
          );
        })
      )
      .subscribe((v) => {
        this._overallSwimLaneData$.next(v);
        this._isOverallSwimLaneLoading$.next(false);
      });
  }

  private _initTopFieldValues() {
    return (
      combineLatest([
        this.anomalyExplorerCommonStateService.getSelectedJobs$(),
        this.anomalyExplorerCommonStateService.getInfluencerFilterQuery$(),
        this.getViewBySwimlaneFieldName$(),
        this.getSwimLanePagination$(),
        this.getSwimLaneCardinality$(),
        this.getSelectedCells$(),
        this.getSwimLaneBucketInterval$(),
        this._timeBounds$,
        this._refreshSubject$,
      ]) as Observable<
        [
          ExplorerJob[],
          InfluencersFilterQuery,
          string,
          SwimLanePagination,
          number,
          AppStateSelectedCells,
          TimeBucketsInterval,
          TimeRangeBounds,
          Refresh
        ]
      >
    )
      .pipe(
        switchMap(
          ([
            selectedJobs,
            influencersFilterQuery,
            viewBySwimlaneFieldName,
            swimLanePagination,
            swimLaneCardinality,
            selectedCells,
            swimLaneBucketInterval,
          ]) => {
            if (!selectedCells?.showTopFieldValues) {
              return of([]);
            }

            const selectionInfluencers = getSelectionInfluencers(
              selectedCells,
              viewBySwimlaneFieldName
            );

            const timerange = getSelectionTimeRange(selectedCells, this.timefilter.getBounds());

            return from(
              this.anomalyTimelineService.loadViewByTopFieldValuesForSelectedTime(
                timerange.earliestMs,
                timerange.latestMs,
                selectedJobs,
                viewBySwimlaneFieldName!,
                ANOMALY_SWIM_LANE_HARD_LIMIT,
                swimLanePagination.viewByPerPage,
                swimLanePagination.viewByFromPage,
                swimLaneBucketInterval,
                selectionInfluencers,
                influencersFilterQuery
              )
            );
          }
        )
      )
      .subscribe(this._topFieldValues$);
  }

  private _initViewBySwimLaneData() {
    return combineLatest([
      this._overallSwimLaneData$.pipe(skipWhile((v) => !v)),
      this.anomalyExplorerCommonStateService.getSelectedJobs$(),
      this.anomalyExplorerCommonStateService.getInfluencerFilterQuery$(),
      this._swimLaneSeverity$,
      this.getSwimLaneBucketInterval$(),
      this.getViewBySwimlaneFieldName$(),
      this.getSwimLanePagination$(),
      this._topFieldValues$.pipe(distinctUntilChanged(isEqual)),
      this._timeBounds$,
      this._refreshSubject$,
    ])
      .pipe(
        tap(() => {
          this._isViewBySwimLaneLoading$.next(true);
        }),
        switchMap(
          ([
            overallSwimLaneData,
            selectedJobs,
            influencersFilterQuery,
            severity,
            bucketInterval,
            viewBySwimlaneFieldName,
            swimLanePagination,
            topFieldValues,
          ]) => {
            return from(
              this.anomalyTimelineService.loadViewBySwimlane(
                topFieldValues,
                {
                  earliest: overallSwimLaneData!.earliest,
                  latest: overallSwimLaneData!.latest,
                },
                selectedJobs,
                viewBySwimlaneFieldName!,
                ANOMALY_SWIM_LANE_HARD_LIMIT,
                swimLanePagination.viewByPerPage,
                swimLanePagination.viewByFromPage,
                undefined,
                influencersFilterQuery,
                bucketInterval!,
                severity
              )
            );
          }
        )
      )
      .subscribe((v) => {
        this._viewBySwimLaneData$.next(v);
        this._isViewBySwimLaneLoading$.next(false);
        this._swimLaneCardinality$.next(v?.cardinality);
      });
  }

  private _initSelectedCells() {
    return combineLatest([
      this._viewBySwimlaneFieldName$,
      this._swimLaneUrlState$,
      this.getSwimLaneBucketInterval$(),
      this._timeBounds$,
    ])
      .pipe(
        map(([viewByFieldName, swimLaneUrlState, swimLaneBucketInterval]) => {
          if (!swimLaneUrlState?.selectedType) {
            return null;
          }

          let times: AnomalyExplorerSwimLaneUrlState['selectedTimes'] =
            swimLaneUrlState.selectedTimes ?? swimLaneUrlState.selectedTime!;
          if (typeof times === 'number') {
            times = [times, times + swimLaneBucketInterval!.asSeconds()];
          }

          let lanes = swimLaneUrlState.selectedLanes ?? swimLaneUrlState.selectedLane!;

          if (typeof lanes === 'string') {
            lanes = [lanes];
          }

          times = this._getAdjustedTimeSelection(times, this.timefilter.getBounds());

          if (!times) {
            return null;
          }

          return {
            type: swimLaneUrlState.selectedType,
            lanes,
            times,
            showTopFieldValues: swimLaneUrlState.showTopFieldValues,
            viewByFieldName,
          } as AppStateSelectedCells;
        }),
        distinctUntilChanged(isEqual)
      )
      .subscribe(this._selectedCells$);
  }

  /**
   * Adjust cell selection with respect to the time boundaries.
   * @return adjusted time selection or undefined if out of current range entirely.
   */
  private _getAdjustedTimeSelection(
    times: AppStateSelectedCells['times'],
    timeBounds: TimeRangeBounds
  ): AppStateSelectedCells['times'] | undefined {
    const [selectedFrom, selectedTo] = times;

    /**
     * Because each cell on the swim lane represent the fixed bucket interval,
     * the selection range could be out of the time boundaries with
     * correction within the bucket interval.
     */
    const bucketSpanInterval = this.getSwimLaneBucketInterval()!.asSeconds();

    const rangeFrom = timeBounds.min!.unix() - bucketSpanInterval;
    const rangeTo = timeBounds.max!.unix() + bucketSpanInterval;

    const resultFrom = Math.max(selectedFrom, rangeFrom);
    const resultTo = Math.min(selectedTo, rangeTo);

    const isSelectionOutOfRange = rangeFrom > resultTo || rangeTo < resultFrom;

    if (isSelectionOutOfRange) {
      // reset selection
      return;
    }

    if (selectedFrom === resultFrom && selectedTo === resultTo) {
      // selection is correct, no need to adjust the range
      return times;
    }

    if (resultFrom !== rangeFrom || resultTo !== rangeTo) {
      return [resultFrom, resultTo];
    }
  }

  /**
   * Obtain the list of 'View by' fields per job and viewBySwimlaneFieldName
   * @private
   *
   * TODO check for possible enhancements/refactoring. Has been moved from explorer_utils as-is.
   */
  private _getViewBySwimlaneOptions(
    currentViewBySwimlaneFieldName: string | undefined,
    filterActive: boolean,
    filteredFields: string[],
    isAndOperator: boolean,
    selectedCells: AppStateSelectedCells | undefined | null,
    selectedJobs: ExplorerJob[] | undefined
  ) {
    const selectedJobIds = selectedJobs?.map((d) => d.id) ?? [];

    // Unique influencers for the selected job(s).
    const viewByOptions: string[] = sortBy(
      uniq(
        mlJobService.jobs.reduce((reducedViewByOptions, job) => {
          if (selectedJobIds.some((jobId) => jobId === job.job_id)) {
            return reducedViewByOptions.concat(job.analysis_config.influencers || []);
          }
          return reducedViewByOptions;
        }, [] as string[])
      ),
      (fieldName) => fieldName.toLowerCase()
    );

    viewByOptions.push(VIEW_BY_JOB_LABEL);
    let viewBySwimlaneOptions = viewByOptions;
    let viewBySwimlaneFieldName: string | undefined;

    if (viewBySwimlaneOptions.indexOf(currentViewBySwimlaneFieldName!) !== -1) {
      // Set the swim lane viewBy to that stored in the state (URL) if set.
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

        const firstJobInfluencers = firstSelectedJob?.analysis_config.influencers ?? [];
        firstSelectedJob?.analysis_config.detectors.forEach((detector) => {
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
    if (filterActive === true && isAndOperator === true && !selectedCells) {
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
        if (!viewBySwimlaneOptions.includes(viewBySwimlaneFieldName!)) {
          viewBySwimlaneFieldName = viewBySwimlaneOptions[0];
        }
      }
    }

    return {
      viewBySwimlaneFieldName,
      viewBySwimlaneOptions,
    };
  }

  /**
   * Provides overall swim lane data.
   */
  public getOverallSwimLaneData$(): Observable<OverallSwimlaneData | null> {
    return this._overallSwimLaneData$.asObservable();
  }

  public getViewBySwimLaneData$(): Observable<OverallSwimlaneData | undefined> {
    return this._viewBySwimLaneData$.asObservable();
  }

  public getContainerWidth$(): Observable<number | undefined> {
    return this._containerWidth$.pipe(
      debounceTime(500),
      distinctUntilChanged((prev, curr) => {
        const delta = Math.abs(prev - curr);
        // Scrollbar appears during the page rendering,
        // it causes small width change that we want to ignore.
        return delta < 20;
      })
    );
  }

  public getContainerWidth(): number | undefined {
    return this._containerWidth$.getValue();
  }

  /**
   * Provides updates for swim lanes cells selection.
   */
  public getSelectedCells$(): Observable<AppStateSelectedCells | undefined | null> {
    return this._selectedCells$.asObservable();
  }

  public getSelectedCells(): AppStateSelectedCells | undefined | null {
    return this._selectedCells$.getValue();
  }

  public getSwimLaneSeverity$(): Observable<number | undefined> {
    return this._swimLaneSeverity$.asObservable();
  }

  public getSwimLaneSeverity(): number | undefined {
    return this._swimLaneSeverity$.getValue();
  }

  public getSwimLanePagination$(): Observable<SwimLanePagination> {
    return this._swimLanePagination$.asObservable();
  }

  public getSwimLanePagination(): SwimLanePagination {
    return this._swimLanePagination$.getValue();
  }

  public setSwimLanePagination(update: Partial<SwimLanePagination>) {
    const resultUpdate = update;
    if (resultUpdate.viewByPerPage) {
      resultUpdate.viewByFromPage = 1;
    }
    this._explorerURLStateCallback(resultUpdate);
  }

  public getSwimLaneCardinality$(): Observable<number | undefined> {
    return this._swimLaneCardinality$.pipe(distinctUntilChanged());
  }

  public getViewBySwimlaneFieldName$(): Observable<string | undefined> {
    return this._viewBySwimlaneFieldName$.pipe(distinctUntilChanged());
  }

  public getViewBySwimLaneOptions$(): Observable<string[]> {
    return this._viewBySwimLaneOptions$.asObservable();
  }

  public getViewBySwimLaneOptions(): string[] {
    return this._viewBySwimLaneOptions$.getValue();
  }

  public isOverallSwimLaneLoading$(): Observable<boolean> {
    return this._isOverallSwimLaneLoading$.asObservable();
  }

  public isViewBySwimLaneLoading$(): Observable<boolean> {
    return this._isViewBySwimLaneLoading$.asObservable();
  }

  /**
   * Sets container width
   * @param value
   */
  public setContainerWidth(value: number) {
    this._containerWidth$.next(value);
  }

  /**
   * Sets swim lanes severity.
   * Updates the URL state.
   * @param value
   */
  public setSeverity(value: number) {
    this._explorerURLStateCallback({ severity: value, viewByFromPage: 1 });
  }

  /**
   * Sets selected cells.
   * @param swimLaneSelectedCells
   */
  public setSelectedCells(swimLaneSelectedCells?: AppStateSelectedCells) {
    const vall = this._swimLaneUrlState$.getValue();

    const mlExplorerSwimlane = {
      ...vall,
    } as AnomalyExplorerSwimLaneUrlState;

    if (swimLaneSelectedCells !== undefined) {
      swimLaneSelectedCells.showTopFieldValues = false;

      const currentSwimlaneType = this._selectedCells$.getValue()?.type;
      const currentShowTopFieldValues = this._selectedCells$.getValue()?.showTopFieldValues;
      const newSwimlaneType = swimLaneSelectedCells?.type;

      if (
        (currentSwimlaneType === SWIMLANE_TYPE.OVERALL &&
          newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
        newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
        currentShowTopFieldValues === true
      ) {
        swimLaneSelectedCells.showTopFieldValues = true;
      }

      mlExplorerSwimlane.selectedType = swimLaneSelectedCells.type;
      mlExplorerSwimlane.selectedLanes = swimLaneSelectedCells.lanes;
      mlExplorerSwimlane.selectedTimes = swimLaneSelectedCells.times;
      mlExplorerSwimlane.showTopFieldValues = swimLaneSelectedCells.showTopFieldValues;

      this._explorerURLStateCallback(mlExplorerSwimlane);
    } else {
      delete mlExplorerSwimlane.selectedType;
      delete mlExplorerSwimlane.selectedLanes;
      delete mlExplorerSwimlane.selectedTimes;
      delete mlExplorerSwimlane.showTopFieldValues;

      this._explorerURLStateCallback(mlExplorerSwimlane, true);
    }
  }

  /**
   * Updates View by swim lane value.
   * @param fieldName - Influencer field name of job id.
   */
  public setViewBySwimLaneFieldName(fieldName: string) {
    this._explorerURLStateCallback(
      {
        viewByFromPage: 1,
        viewByPerPage: this._swimLanePagination$.getValue().viewByPerPage,
        viewByFieldName: fieldName,
      },
      true
    );
  }

  public getSwimLaneBucketInterval$(): Observable<TimeBucketsInterval> {
    return this._swimLaneBucketInterval$.pipe(
      filter((v): v is TimeBucketsInterval => !!v),
      distinctUntilChanged((prev, curr) => {
        return prev.asSeconds() === curr.asSeconds();
      })
    );
  }

  public getSwimLaneBucketInterval(): TimeBucketsInterval | null {
    return this._swimLaneBucketInterval$.getValue();
  }
}
