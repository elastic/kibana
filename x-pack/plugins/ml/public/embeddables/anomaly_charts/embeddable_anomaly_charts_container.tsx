/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState, useMemo, useEffect } from 'react';
import { EuiCallOut, EuiLoadingChart, EuiResizeObserver, EuiText } from '@elastic/eui';
import { Observable } from 'rxjs';
import { FormattedMessage } from '@kbn/i18n-react';
import { throttle } from 'lodash';
import { UI_SETTINGS } from '@kbn/data-plugin/common';
import { useAnomalyChartsInputResolver } from './use_anomaly_charts_input_resolver';
import type { IAnomalyChartsEmbeddable } from './anomaly_charts_embeddable';
import type {
  AnomalyChartsEmbeddableInput,
  AnomalyChartsEmbeddableOutput,
  AnomalyChartsEmbeddableServices,
} from '..';
import type { EntityField, EntityFieldOperation } from '../../../common/util/anomaly_utils';

import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts/explorer_anomalies_container';
import { ML_APP_LOCATOR } from '../../../common/constants/locator';
import { optionValueToThreshold } from '../../application/components/controls/select_severity/select_severity';
import { ANOMALY_THRESHOLD } from '../../../common';
import { TimeBuckets } from '../../application/util/time_buckets';
import { EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER } from '../../ui_actions/triggers';
import { MlLocatorParams } from '../../../common/types/locator';

const RESIZE_THROTTLE_TIME_MS = 500;

export interface EmbeddableAnomalyChartsContainerProps {
  id: string;
  embeddableContext: InstanceType<IAnomalyChartsEmbeddable>;
  embeddableInput: Observable<AnomalyChartsEmbeddableInput>;
  services: AnomalyChartsEmbeddableServices;
  refresh: Observable<any>;
  onInputChange: (input: Partial<AnomalyChartsEmbeddableInput>) => void;
  onOutputChange: (output: Partial<AnomalyChartsEmbeddableOutput>) => void;
  onRenderComplete: () => void;
  onLoading: () => void;
  onError: (error: Error) => void;
}

export const EmbeddableAnomalyChartsContainer: FC<EmbeddableAnomalyChartsContainerProps> = ({
  id,
  embeddableContext,
  embeddableInput,
  services,
  refresh,
  onInputChange,
  onOutputChange,
  onRenderComplete,
  onError,
  onLoading,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [severity, setSeverity] = useState(
    optionValueToThreshold(
      embeddableContext.getInput().severityThreshold ?? ANOMALY_THRESHOLD.WARNING
    )
  );
  const [selectedEntities, setSelectedEntities] = useState<EntityField[] | undefined>();
  const [{ uiSettings }, { data: dataServices, share, uiActions, charts: chartsService }] =
    services;
  const { timefilter } = dataServices.query.timefilter;

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
  }, []);

  useEffect(() => {
    onInputChange({
      severityThreshold: severity.val,
    });
    onOutputChange({
      severity: severity.val,
      entityFields: selectedEntities,
    });
  }, [severity, selectedEntities]);

  const {
    chartsData,
    isLoading: isExplorerLoading,
    error,
  } = useAnomalyChartsInputResolver(
    embeddableInput,
    onInputChange,
    refresh,
    services,
    chartWidth,
    severity.val,
    { onRenderComplete, onError, onLoading }
  );
  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      if (Math.abs(chartWidth - e.width) > 20) {
        setChartWidth(e.width);
      }
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  if (error) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.anomalyChartsEmbeddable.errorMessage"
            defaultMessage="Unable to load the ML anomaly explorer data"
          />
        }
        color="danger"
        iconType="alert"
        style={{ width: '100%' }}
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  const addEntityFieldFilter = (
    fieldName: string,
    fieldValue: string,
    operation: EntityFieldOperation
  ) => {
    const entity: EntityField = {
      fieldName,
      fieldValue,
      operation,
    };
    const uniqueSelectedEntities = [entity];
    setSelectedEntities(uniqueSelectedEntities);
    uiActions.getTrigger(EXPLORER_ENTITY_FIELD_SELECTION_TRIGGER).exec({
      embeddable: embeddableContext,
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
          }}
          data-test-subj={`mlExplorerEmbeddable_${embeddableContext.id}`}
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
          {chartsData !== undefined && isExplorerLoading === false && (
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
            />
          )}
        </div>
      )}
    </EuiResizeObserver>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableAnomalyChartsContainer;
