/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useState, useMemo, useEffect, useRef } from 'react';
import { EuiCallOut, EuiLoadingChart, EuiResizeObserver, EuiText } from '@elastic/eui';
import type { Observable } from 'rxjs';
import { combineLatest, tap, debounceTime, switchMap, skipWhile, startWith, of } from 'rxjs';
import { FormattedMessage } from '@kbn/i18n-react';
import { throttle } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  type MlEntityField,
  type MlEntityFieldOperation,
  ML_ANOMALY_THRESHOLD,
} from '@kbn/ml-anomaly-utils';
import { TimeBuckets } from '@kbn/ml-time-buckets';
import { Subject, catchError } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { TimeRange } from '@kbn/es-query';
import type { InfluencersFilterQuery } from '@kbn/ml-anomaly-utils';
import type { CoreStart } from '@kbn/core/public';
import type {
  AnomalyChartsEmbeddableCustomInput,
  AnomalyChartsEmbeddableServices,
  AnomalyChartsServices,
  AnomalyChartsApi,
} from '..';

import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts/explorer_anomalies_container';
import { ML_APP_LOCATOR } from '../../../common/constants/locator';
import { optionValueToThreshold } from '../../application/components/controls/select_severity/select_severity';
import { EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER } from '../../ui_actions/triggers';
import type { MlLocatorParams } from '../../../common/types/locator';
import { getJobsObservable } from '../common/get_jobs_observable';
import { OVERALL_LABEL, SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import { processFilters } from '../common/process_filters';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import {
  getSelectionInfluencers,
  getSelectionJobIds,
  getSelectionTimeRange,
} from '../../application/explorer/explorer_utils';
import type { ExplorerChartsData } from '../../application/explorer/explorer_charts/explorer_charts_container_service';
import type { MlStartDependencies } from '../../plugin';

const RESIZE_THROTTLE_TIME_MS = 500;
const FETCH_RESULTS_DEBOUNCE_MS = 500;

export interface EmbeddableAnomalyChartsContainerProps
  extends Partial<AnomalyChartsEmbeddableCustomInput> {
  lastReloadRequestTime?: number;
  api: AnomalyChartsApi;
  id: string;
  services: AnomalyChartsEmbeddableServices;
  timeRange$: Observable<TimeRange | undefined>;
  onRenderComplete: () => void;
  onLoading: (v: boolean) => void;
  onError: (error: Error) => void;
}
function useAnomalyChartsData(
  api: AnomalyChartsApi,
  services: [CoreStart, MlStartDependencies, AnomalyChartsServices],
  timeRange$: Observable<TimeRange | undefined>,
  chartWidth: number,
  severity: number,
  renderCallbacks: {
    onRenderComplete: () => void;
    onLoading: (v: boolean) => void;
    onError: (error: Error) => void;
  }
): {
  chartsData: ExplorerChartsData | undefined;
  isLoading: boolean;
  error: Error | null | undefined;
} {
  const [, , { anomalyDetectorService, anomalyExplorerService }] = services;

  const [chartsData, setChartsData] = useState<ExplorerChartsData>();
  const [error, setError] = useState<Error | null>();
  const [isLoading, setIsLoading] = useState(false);

  const chartWidth$ = useMemo(() => new Subject<number>(), []);
  const severity$ = useMemo(() => new Subject<number>(), []);

  useEffect(() => {
    const subscription = combineLatest([
      getJobsObservable(api.jobIds$, anomalyDetectorService, setError),
      api.maxSeriesToPlot$,
      timeRange$,
      api.filters$,
      api.query$,
      chartWidth$.pipe(skipWhile((v) => !v)),
      severity$,
      api.refresh$.pipe(startWith(null)),
    ])
      .pipe(
        tap(setIsLoading.bind(null, true)),
        debounceTime(FETCH_RESULTS_DEBOUNCE_MS),
        tap(() => {
          renderCallbacks.onLoading(true);
        }),
        switchMap((args) => {
          const [
            explorerJobs,
            maxSeriesToPlot,
            timeRangeInput,
            filters,
            query,
            embeddableContainerWidth,
            severityValue,
          ] = args;
          if (!explorerJobs) {
            // couldn't load the list of jobs
            return of(undefined);
          }

          const viewBySwimlaneFieldName = OVERALL_LABEL;

          if (timeRangeInput) {
            anomalyExplorerService.setTimeRange(timeRangeInput);
          }

          let influencersFilterQuery: InfluencersFilterQuery | undefined;
          try {
            if (filters || query) {
              influencersFilterQuery = processFilters(filters, query);
            }
          } catch (e) {
            // handle query syntax errors
            setError(e);
            return of(undefined);
          }

          const bounds = anomalyExplorerService.getTimeBounds();

          // Can be from input time range or from the timefilter bar
          const selections: AppStateSelectedCells = {
            lanes: [OVERALL_LABEL],
            times: [bounds.min?.unix()!, bounds.max?.unix()!],
            type: SWIMLANE_TYPE.OVERALL,
          };

          const selectionInfluencers = getSelectionInfluencers(selections, viewBySwimlaneFieldName);

          const jobIds = getSelectionJobIds(selections, explorerJobs);

          const timeRange = getSelectionTimeRange(selections, bounds);

          return anomalyExplorerService.getAnomalyData$(
            jobIds,
            embeddableContainerWidth,
            timeRange.earliestMs,
            timeRange.latestMs,
            influencersFilterQuery,
            selectionInfluencers,
            severityValue ?? 0,
            maxSeriesToPlot
          );
        }),
        catchError((e) => {
          // eslint-disable-next-line no-console
          console.error(`Error occured fetching anomaly charts data for embeddable\n`, e);
          setError(e.body);
          return of(undefined);
        })
      )
      .subscribe((results) => {
        if (results !== undefined) {
          setError(null);
          setChartsData(results);
          setIsLoading(false);
          renderCallbacks.onLoading(false);
          renderCallbacks.onRenderComplete();
        }
      });

    return () => {
      subscription?.unsubscribe();
      chartWidth$.complete();
      severity$.complete();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    chartWidth$.next(chartWidth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartWidth]);

  useEffect(() => {
    severity$.next(severity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity]);

  useEffect(() => {
    if (error) {
      renderCallbacks.onError(error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  return { chartsData, isLoading, error };
}

const EmbeddableAnomalyChartsContainer: FC<EmbeddableAnomalyChartsContainerProps> = ({
  id,
  timeRange$,
  severityThreshold,
  services,
  onRenderComplete,
  onError,
  onLoading,
  api,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [severity, setSeverity] = useState(
    optionValueToThreshold(
      severityThreshold !== undefined ? severityThreshold : ML_ANOMALY_THRESHOLD.WARNING
    )
  );
  const [selectedEntities, setSelectedEntities] = useState<MlEntityField[] | undefined>();
  const [{ uiSettings }, { data: dataServices, share, uiActions, charts: chartsService }] =
    services;
  const { timefilter } = dataServices.query.timefilter;
  const timeRange = useObservable(timeRange$);

  const mlLocator = useMemo(
    () => share.url.locators.get<MlLocatorParams>(ML_APP_LOCATOR)!,
    [share]
  );

  const timeBuckets = useMemo(() => {
    return new TimeBuckets({
      'histogram:maxBars': uiSettings.get(UI_SETTINGS.HISTOGRAM_MAX_BARS),
      'histogram:barTarget': uiSettings.get(UI_SETTINGS.HISTOGRAM_BAR_TARGET),
      dateFormat: uiSettings.get('dateFormat'),
      'dateFormat:scaled': uiSettings.get('dateFormat:scaled'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (api?.updateSeverityThreshold) {
      api.updateSeverityThreshold(severity.val);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [severity.val, api?.updateSeverityThreshold]);

  useEffect(() => {
    if (api?.updateSelectedEntities) {
      api.updateSelectedEntities(selectedEntities);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntities, api?.updateSelectedEntities]);

  const renderCallbacks = useMemo(() => {
    return { onRenderComplete, onError, onLoading };
  }, [onRenderComplete, onError, onLoading]);
  const {
    chartsData,
    isLoading: isExplorerLoading,
    error,
  } = useAnomalyChartsData(api, services, timeRange$, chartWidth, severity.val, renderCallbacks);

  // Holds the container height for previously fetched data
  const containerHeightRef = useRef<number>();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      // Keep previous container height so it doesn't change the page layout
      if (!isExplorerLoading) {
        containerHeightRef.current = e.height;
      }

      if (Math.abs(chartWidth - e.width) > 20) {
        setChartWidth(e.width);
      }
    }, RESIZE_THROTTLE_TIME_MS),
    [!isExplorerLoading, chartWidth]
  );

  const containerHeight = useMemo(() => {
    // Persists container height during loading to prevent page from jumping
    return isExplorerLoading ? containerHeightRef.current : undefined;
  }, [isExplorerLoading]);

  if (error) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.anomalyChartsEmbeddable.errorMessage"
            defaultMessage="Unable to load the data for the anomaly charts"
          />
        }
        color="danger"
        iconType="warning"
        style={{ width: '100%' }}
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  const addEntityFieldFilter = (
    fieldName: string,
    fieldValue: string,
    operation: MlEntityFieldOperation
  ) => {
    const entity: MlEntityField = {
      fieldName,
      fieldValue,
      operation,
    };
    const uniqueSelectedEntities = [entity];
    setSelectedEntities(uniqueSelectedEntities);
    uiActions.getTrigger(EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER).exec({
      embeddable: api,
      data: uniqueSelectedEntities,
    });
  };

  return (
    <EuiResizeObserver onResize={resizeHandler}>
      {(resizeRef) => (
        <div
          id={`mlAnomalyExplorerEmbeddableWrapper-${id}`}
          style={{
            width: '100%',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '8px',
            height: containerHeight,
          }}
          data-test-subj={`mlExplorerEmbeddable_${id}`}
          ref={resizeRef}
        >
          {isExplorerLoading && (
            <EuiText
              textAlign={'center'}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%,-50%)',
              }}
            >
              <EuiLoadingChart
                size="xl"
                mono={true}
                data-test-subj="mlAnomalyExplorerEmbeddableLoadingIndicator"
              />
            </EuiText>
          )}
          {chartsData !== undefined && isExplorerLoading === false ? (
            <ExplorerAnomaliesContainer
              id={id}
              showCharts={true}
              chartsData={chartsData}
              severity={severity}
              setSeverity={setSeverity}
              mlLocator={mlLocator}
              timeBuckets={timeBuckets}
              timefilter={timefilter}
              onSelectEntity={addEntityFieldFilter}
              showSelectedInterval={false}
              chartsService={chartsService}
              timeRange={timeRange}
            />
          ) : null}
        </div>
      )}
    </EuiResizeObserver>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableAnomalyChartsContainer;
