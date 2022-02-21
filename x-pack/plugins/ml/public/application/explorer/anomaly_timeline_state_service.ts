/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BehaviorSubject, combineLatest, from, Observable, Subject } from 'rxjs';
import { switchMap, map, skipWhile, distinctUntilChanged, startWith } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { AnomalyTimelineService } from '../services/anomaly_timeline_service';
import type {
  AppStateSelectedCells,
  OverallSwimlaneData,
  ViewBySwimLaneData,
} from './explorer_utils';
import type { AnomalyExplorerCommonStateService } from './anomaly_explorer_common_state';
import type { AnomalyExplorerSwimLaneUrlState } from '../../../common/types/locator';
import type { TimefilterContract } from '../../../../../../src/plugins/data/public';
import type { TimeRangeBounds } from '../../../../../../src/plugins/data/common';

/**
 * Service for managing anomaly timeline state.
 */
export class AnomalyTimelineStateService {
  private _explorerURLStateCallback:
    | ((update: AnomalyExplorerSwimLaneUrlState, replaceState?: boolean) => void)
    | null = null;

  private _bucketSpanInterval: number | null = null;

  private _overallSwimLaneData$ = new BehaviorSubject<OverallSwimlaneData | null>(null);
  private _viewBySwimLaneData$ = new BehaviorSubject<ViewBySwimLaneData | null>(null);

  private _containerWidth$ = new Subject<number>();
  private _swimLaneUrlState$ = new BehaviorSubject<AnomalyExplorerSwimLaneUrlState | null>(null);

  private _selectedCells$ = new BehaviorSubject<AppStateSelectedCells | undefined>(undefined);

  constructor(
    private anomalyExplorerCommonStateService: AnomalyExplorerCommonStateService,
    private anomalyTimelineService: AnomalyTimelineService,
    private timefilter: TimefilterContract
  ) {
    this._init();
  }

  /**
   * Initializes required subscriptions for fetching swim lanes data.
   * @private
   */
  private _init() {
    combineLatest([
      this.anomalyExplorerCommonStateService.getSelectedJobs$(),
      this._swimLaneUrlState$,
      this._containerWidth$,
    ])
      .pipe(
        skipWhile(([selectedJobs]) => !selectedJobs),
        switchMap(([selectedJobs, swimLaneUrlState, containerWidth]) => {
          return from(
            this.anomalyTimelineService.loadOverallData(
              selectedJobs!,
              containerWidth,
              undefined,
              swimLaneUrlState?.severity
            )
          );
        })
      )
      .subscribe(this._overallSwimLaneData$);

    combineLatest([
      this.anomalyExplorerCommonStateService.getSelectedJobs$(),
      this._containerWidth$,
    ]).subscribe(([selectedJobs, containerWidth]) => {
      if (!selectedJobs) return;
      this._bucketSpanInterval = this.anomalyTimelineService
        .getSwimlaneBucketInterval(selectedJobs, containerWidth)
        .asSeconds();
    });

    combineLatest([this._swimLaneUrlState$, this.timefilter.getTimeUpdate$().pipe(startWith(null))])
      .pipe(
        map(([swimLaneUrlState]) => {
          if (!swimLaneUrlState?.selectedType) {
            return;
          }

          let times: AnomalyExplorerSwimLaneUrlState['selectedTimes'] =
            swimLaneUrlState.selectedTimes ?? swimLaneUrlState.selectedTime!;
          if (typeof times === 'number') {
            times = [times, times + this._bucketSpanInterval!];
          }

          let lanes = swimLaneUrlState.selectedLanes ?? swimLaneUrlState.selectedLane!;

          if (typeof lanes === 'string') {
            lanes = [lanes];
          }

          times = this._getAdjustedTimeSelection(times, this.timefilter.getBounds());

          if (!times) {
            return;
          }

          return {
            type: swimLaneUrlState.selectedType,
            lanes,
            times,
            showTopFieldValues: swimLaneUrlState.showTopFieldValues,
            viewByFieldName: swimLaneUrlState.viewByFieldName,
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
    const rangeFrom = timeBounds.min!.unix() - this._bucketSpanInterval!;
    const rangeTo = timeBounds.max!.unix() + this._bucketSpanInterval!;

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
   * Provides overall swim lane data.
   */
  public getOverallSwimLaneData$(): Observable<OverallSwimlaneData | null> {
    return this._overallSwimLaneData$.asObservable();
  }

  public getViewBySwimLaneData$(): Observable<OverallSwimlaneData | null> {
    return this._viewBySwimLaneData$.asObservable();
  }

  /**
   * Provides updates for swim lanes cells selection.
   */
  public getSelectedCells$(): Observable<AppStateSelectedCells | undefined> {
    return this._selectedCells$.asObservable();
  }

  /**
   * Updates internal subject from the URL state.
   * @param value
   */
  public updateFromUrlState(value: AnomalyExplorerSwimLaneUrlState | undefined) {
    this._swimLaneUrlState$.next(value);
  }

  /**
   * Updates callback for setting URL app state.
   * @param callback
   */
  public updateSetStateCallback(callback: (update: AnomalyExplorerSwimLaneUrlState) => void) {
    this._explorerURLStateCallback = callback;
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
    this._explorerURLStateCallback!({ severity: value, viewByFromPage: 1 });
  }

  /**
   * Sets selected cells.
   * @param swimLaneSelectedCells
   */
  public setSelectedCells(swimLaneSelectedCells?: AppStateSelectedCells) {
    console.log(swimLaneSelectedCells, '___swimLaneSelectedCells___');

    const vall = this._swimLaneUrlState$.getValue();

    console.log(vall, '___vall___');

    const mlExplorerSwimlane = {
      ...vall,
    } as AnomalyExplorerSwimLaneUrlState;

    if (swimLaneSelectedCells !== undefined) {
      swimLaneSelectedCells.showTopFieldValues = false;

      // const currentSwimlaneType = selectedCells?.type;
      // const currentShowTopFieldValues = selectedCells?.showTopFieldValues;
      const newSwimlaneType = swimLaneSelectedCells?.type;

      // if (
      //   (currentSwimlaneType === SWIMLANE_TYPE.OVERALL &&
      //     newSwimlaneType === SWIMLANE_TYPE.VIEW_BY) ||
      //   newSwimlaneType === SWIMLANE_TYPE.OVERALL ||
      //   currentShowTopFieldValues === true
      // ) {
      //   swimLaneSelectedCells.showTopFieldValues = true;
      // }

      mlExplorerSwimlane.selectedType = swimLaneSelectedCells.type;
      mlExplorerSwimlane.selectedLanes = swimLaneSelectedCells.lanes;
      mlExplorerSwimlane.selectedTimes = swimLaneSelectedCells.times;
      mlExplorerSwimlane.showTopFieldValues = swimLaneSelectedCells.showTopFieldValues;

      this._explorerURLStateCallback!(mlExplorerSwimlane);
    } else {
      delete mlExplorerSwimlane.selectedType;
      delete mlExplorerSwimlane.selectedLanes;
      delete mlExplorerSwimlane.selectedTimes;
      delete mlExplorerSwimlane.showTopFieldValues;

      this._explorerURLStateCallback!(mlExplorerSwimlane, true);
    }
  }

  public setPagination() {}

  /**
   * Updates View by swim lane value.
   * @param fieldName - Influencer field name of job id.
   */
  public setViewBySwimLaneFieldName(fieldName: string) {
    this._explorerURLStateCallback!(
      {
        viewByFromPage: 1,
        viewByFieldName: fieldName,
        selectedLanes: undefined,
        selectedTimes: undefined,
        selectedType: undefined,
      },
      true
    );
  }
}
