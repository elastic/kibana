/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useCallback, useState } from 'react';
import {
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingChart,
  EuiResizeObserver,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { Observable } from 'rxjs';

import { throttle } from 'lodash';
import { CoreStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { ExplorerSwimlane } from '../../application/explorer/explorer_swimlane';
import { MlStartDependencies } from '../../plugin';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from './anomaly_swimlane_embeddable';
import { MlTooltipComponent } from '../../application/components/chart_tooltip';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import { SwimlaneType } from '../../application/explorer/explorer_constants';

const RESIZE_THROTTLE_TIME_MS = 500;

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>;
  services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];
  refresh: Observable<any>;
  onOutputChange?: (output: Partial<AnomalySwimlaneEmbeddableOutput>) => void;
}

export const ExplorerSwimlaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  embeddableInput,
  services,
  refresh,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

  const [swimlaneType, swimlaneData, timeBuckets, error] = useSwimlaneInputResolver(
    embeddableInput,
    refresh,
    services,
    chartWidth
  );

  const onResize = useCallback(
    throttle((e: { width: number; height: number }) => {
      const labelWidth = 200;
      setChartWidth(e.width - labelWidth);
    }, RESIZE_THROTTLE_TIME_MS),
    []
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
    <EuiResizeObserver onResize={onResize}>
      {(resizeRef) => (
        <div
          style={{ width: '100%', height: '100%', overflowY: 'auto', overflowX: 'hidden' }}
          data-test-subj={`mlMaxAnomalyScoreEmbeddable_${id}`}
          ref={(el) => {
            resizeRef(el);
          }}
        >
          <div style={{ width: '100%' }}>
            <EuiSpacer size="m" />

            {chartWidth > 0 && swimlaneData && swimlaneType ? (
              <EuiText color="subdued" size="s" data-test-subj="mlAnomalySwimlaneEmbeddableWrapper">
                <MlTooltipComponent>
                  {(tooltipService) => (
                    <ExplorerSwimlane
                      chartWidth={chartWidth}
                      timeBuckets={timeBuckets}
                      swimlaneData={swimlaneData}
                      swimlaneType={swimlaneType as SwimlaneType}
                      tooltipService={tooltipService}
                    />
                  )}
                </MlTooltipComponent>
              </EuiText>
            ) : (
              <EuiFlexGroup justifyContent="spaceAround">
                <EuiFlexItem grow={false}>
                  <EuiLoadingChart
                    size="xl"
                    data-test-subj={`loading_mlMaxAnomalyScoreEmbeddable_${id}`}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
          </div>
        </div>
      )}
    </EuiResizeObserver>
  );
};
