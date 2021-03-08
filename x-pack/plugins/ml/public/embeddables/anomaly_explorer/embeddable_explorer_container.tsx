/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState, useEffect, useMemo } from 'react';
import { EuiCallOut, EuiLoadingChart, EuiResizeObserver, EuiText } from '@elastic/eui';
import { Observable } from 'rxjs';
import { FormattedMessage } from '@kbn/i18n/react';
import { throttle } from 'lodash';
import { IAnomalyExplorerEmbeddable } from './anomaly_explorer_embeddable';
import { useExplorerInputResolver } from './explorer_input_resolver';
import { useSwimlaneInputResolver } from '../anomaly_swimlane/swimlane_input_resolver';
import {
  AnomalyExplorerEmbeddableInput,
  AnomalyExplorerEmbeddableOutput,
  AnomalyExplorerEmbeddableServices,
} from '..';
import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts_container';
import { ML_APP_URL_GENERATOR } from '../../../common/constants/ml_url_generator';
import { optionValueToThreshold } from '../../application/components/controls/select_severity/select_severity';
import { ANOMALY_THRESHOLD } from '../../../common';

const RESIZE_THROTTLE_TIME_MS = 500;

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableContext: InstanceType<IAnomalyExplorerEmbeddable>;
  embeddableInput: Observable<AnomalyExplorerEmbeddableInput>;
  services: AnomalyExplorerEmbeddableServices;
  refresh: Observable<any>;
  onInputChange: (input: Partial<AnomalyExplorerEmbeddableInput>) => void;
  onOutputChange: (output: Partial<AnomalyExplorerEmbeddableOutput>) => void;
}

export const EmbeddableExplorerContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  embeddableContext,
  embeddableInput,
  services,
  refresh,
  onInputChange,
  onOutputChange,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [fromPage] = useState<number>(1);
  const [severity, setSeverity] = useState(optionValueToThreshold(ANOMALY_THRESHOLD.MINOR));

  const [
    {},
    {
      data: dataServices,
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  ] = services;
  const { timefilter } = dataServices.query.timefilter;

  const mlUrlGenerator = useMemo(() => getUrlGenerator(ML_APP_URL_GENERATOR), [getUrlGenerator]);

  const [, swimlaneData, perPage, , timeBuckets, , error] = useSwimlaneInputResolver(
    embeddableInput,
    onInputChange,
    refresh,
    services,
    chartWidth,
    fromPage
  );

  const { chartsData, isLoading: isExplorerLoading } = useExplorerInputResolver(
    embeddableInput,
    onInputChange,
    refresh,
    services,
    chartWidth,
    severity.val
  );

  useEffect(() => {
    onOutputChange({
      perPage,
      fromPage,
      interval: swimlaneData?.interval,
    });
  }, [perPage, fromPage, swimlaneData]);

  const resizeHandler = useCallback(
    throttle((e: { width: number; height: number }) => {
      setChartWidth(e.width);
    }, RESIZE_THROTTLE_TIME_MS),
    [chartWidth]
  );

  if (error) {
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.errorMessage"
            defaultMessage="Unable to load the ML swim lane data"
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

  return (
    <div
      id={`mlAnomalyExplorerEmbeddableWrapper-${id}`}
      style={{
        width: '100%',
        overflowY: 'scroll',
        padding: '8px',
      }}
      data-test-subj={`mlExplorerEmbeddable_${embeddableContext.id}`}
    >
      <EuiResizeObserver onResize={resizeHandler}>
        {(resizeRef) => (
          <div ref={resizeRef}>
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
                  data-test-subj="mlSwimLaneLoadingIndicator"
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
                mlUrlGenerator={mlUrlGenerator}
                timeBuckets={timeBuckets}
                timefilter={timefilter}
              />
            )}
          </div>
        )}
      </EuiResizeObserver>
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableExplorerContainer;
