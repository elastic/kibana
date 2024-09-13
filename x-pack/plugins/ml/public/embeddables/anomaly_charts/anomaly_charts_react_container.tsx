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
import { FormattedMessage } from '@kbn/i18n-react';
import { throttle } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import {
  type MlEntityField,
  type MlEntityFieldOperation,
  ML_ANOMALY_THRESHOLD,
} from '@kbn/ml-anomaly-utils';
import { TimeBuckets } from '@kbn/ml-time-buckets';
import useObservable from 'react-use/lib/useObservable';
import type { TimeRange } from '@kbn/es-query';
import type {
  AnomalyChartsEmbeddableOverridableState,
  AnomalyChartsEmbeddableServices,
  AnomalyChartsApi,
  AnomalyChartsAttachmentApi,
} from '..';

import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts/explorer_anomalies_container';
import { ML_APP_LOCATOR } from '../../../common/constants/locator';
import { optionValueToThreshold } from '../../application/components/controls/select_severity/select_severity';
import { EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER } from '../../ui_actions/triggers';
import type { MlLocatorParams } from '../../../common/types/locator';
import { useAnomalyChartsData } from './use_anomaly_charts_data';

const RESIZE_THROTTLE_TIME_MS = 500;

export interface AnomalyChartsContainerProps
  extends Partial<AnomalyChartsEmbeddableOverridableState> {
  lastReloadRequestTime?: number;
  api: AnomalyChartsApi | AnomalyChartsAttachmentApi;
  id: string;
  services: AnomalyChartsEmbeddableServices;
  timeRange$: Observable<TimeRange | undefined>;
  onRenderComplete: () => void;
  onLoading: (v: boolean) => void;
  onError: (error: Error) => void;
}

const AnomalyChartsContainer: FC<AnomalyChartsContainerProps> = ({
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
  } = useAnomalyChartsData(api, services, chartWidth, severity.val, renderCallbacks);

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
export default AnomalyChartsContainer;
