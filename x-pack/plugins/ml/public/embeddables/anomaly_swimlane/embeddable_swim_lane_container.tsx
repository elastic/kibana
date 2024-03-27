/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';
import type { FC } from 'react';
import React, { useCallback, useState } from 'react';
import type { Observable } from 'rxjs';

import { css } from '@emotion/react';
import type { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import type { AnomalySwimlaneServices } from '..';
import type { MlDependencies } from '../../application/app';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import { Y_AXIS_LABEL_WIDTH } from '../../application/explorer/swimlane_annotation_container';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import type { AnomalySwimLaneEmbeddableApi } from './types';
// import { useEmbeddableExecutionContext } from '../common/use_embeddable_execution_context';

export interface ExplorerSwimlaneContainerProps {
  id: string;
  services: [CoreStart, MlDependencies, AnomalySwimlaneServices];
  refresh: Observable<void>;
  onRenderComplete: () => void;
  onLoading: () => void;
  onError: (error: Error) => void;
  api: AnomalySwimLaneEmbeddableApi;
}

export const EmbeddableSwimLaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  services,
  refresh,
  onRenderComplete,
  onLoading,
  onError,
  api,
}) => {
  // useEmbeddableExecutionContext<AnomalySwimlaneEmbeddableInput>(
  //   services[0].executionContext,
  //   embeddableInput$,
  //   ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  //   id
  // );

  const [chartWidth, setChartWidth] = useState<number>(0);

  const [fromPage, perPage] = useBatchedPublishingSubjects(api.fromPage, api.perPage);

  const [{}, { uiActions, charts: chartsService }] = services;

  const [selectedCells, setSelectedCells] = useState<AppStateSelectedCells | undefined>();

  const [swimlaneType, swimlaneData, timeBuckets, isLoading, error] = useSwimlaneInputResolver(
    api,
    refresh,
    services,
    chartWidth,
    {
      onError,
      onLoading,
    }
  );

  const onCellsSelection = useCallback(
    (update?: AppStateSelectedCells) => {
      setSelectedCells(update);

      if (update) {
        uiActions.getTrigger(SWIM_LANE_SELECTION_TRIGGER).exec({
          embeddable: api,
          data: update,
          updateCallback: setSelectedCells.bind(null, undefined),
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [swimlaneData, perPage, setSelectedCells]
  );

  if (error) {
    onRenderComplete();
    return (
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.errorMessage"
            defaultMessage="Unable to load the ML swim lane data"
          />
        }
        color="danger"
        iconType="warning"
        css={{ width: '100%' }}
      >
        <p>{error.message}</p>
      </EuiCallOut>
    );
  }

  return (
    <div
      css={css`
        width: 100%;
        padding: 8px;
      `}
      data-test-subj="mlAnomalySwimlaneEmbeddableWrapper"
    >
      <SwimlaneContainer
        id={id}
        data-test-subj={`mlSwimLaneEmbeddable_${id}`}
        timeBuckets={timeBuckets}
        swimlaneData={swimlaneData!}
        swimlaneType={swimlaneType as SwimlaneType}
        fromPage={fromPage}
        perPage={perPage}
        swimlaneLimit={isViewBySwimLaneData(swimlaneData) ? swimlaneData.cardinality : undefined}
        onResize={setChartWidth}
        selection={selectedCells}
        onCellsSelection={onCellsSelection}
        onPaginationChange={(update) => {
          if (update.fromPage) {
            api.updatePagination({ fromPage: update.fromPage });
          }
          if (update.perPage) {
            api.updatePagination({ perPage: update.perPage, fromPage: 1 });
          }
        }}
        isLoading={isLoading}
        yAxisWidth={{ max: Y_AXIS_LABEL_WIDTH }}
        noDataWarning={
          <EuiEmptyPrompt
            titleSize="xxs"
            css={{ padding: 0 }}
            title={
              <h2>
                <FormattedMessage
                  id="xpack.ml.swimlaneEmbeddable.noDataFound"
                  defaultMessage="No anomalies found"
                />
              </h2>
            }
          />
        }
        chartsService={chartsService}
        onRenderComplete={onRenderComplete}
      />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableSwimLaneContainer;
