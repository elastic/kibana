/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState, useEffect } from 'react';
import { EuiCallOut, EuiEmptyPrompt } from '@elastic/eui';
import { Observable } from 'rxjs';

import { CoreStart } from '@kbn/core/public';
import { FormattedMessage } from '@kbn/i18n-react';
import { IAnomalySwimlaneEmbeddable } from './anomaly_swimlane_embeddable';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import { SwimlaneType } from '../../application/explorer/explorer_constants';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';
import { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import { MlDependencies } from '../../application/app';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from '..';

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableContext: InstanceType<IAnomalySwimlaneEmbeddable>;
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>;
  services: [CoreStart, MlDependencies, AnomalySwimlaneServices];
  refresh: Observable<any>;
  onInputChange: (input: Partial<AnomalySwimlaneEmbeddableInput>) => void;
  onOutputChange: (output: Partial<AnomalySwimlaneEmbeddableOutput>) => void;
  onRenderComplete: () => void;
  onLoading: () => void;
  onError: (error: Error) => void;
}

export const EmbeddableSwimLaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  embeddableContext,
  embeddableInput,
  services,
  refresh,
  onInputChange,
  onOutputChange,
  onRenderComplete,
  onLoading,
  onError,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

  const [fromPage, setFromPage] = useState<number>(1);

  const [{}, { uiActions }] = services;

  const [selectedCells, setSelectedCells] = useState<AppStateSelectedCells | undefined>();

  const [swimlaneType, swimlaneData, perPage, setPerPage, timeBuckets, isLoading, error] =
    useSwimlaneInputResolver(
      embeddableInput,
      onInputChange,
      refresh,
      services,
      chartWidth,
      fromPage,
      { onRenderComplete, onError, onLoading }
    );

  useEffect(() => {
    onOutputChange({
      perPage,
      fromPage,
      interval: swimlaneData?.interval,
    });
  }, [perPage, fromPage, swimlaneData]);

  const onCellsSelection = useCallback(
    (update?: AppStateSelectedCells) => {
      setSelectedCells(update);

      if (update) {
        uiActions.getTrigger(SWIM_LANE_SELECTION_TRIGGER).exec({
          embeddable: embeddableContext,
          data: update,
          updateCallback: setSelectedCells.bind(null, undefined),
        });
      }
    },
    [swimlaneData, perPage, fromPage, setSelectedCells]
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
      style={{ width: '100%', padding: '8px' }}
      data-test-subj="mlAnomalySwimlaneEmbeddableWrapper"
    >
      <SwimlaneContainer
        id={id}
        data-test-subj={`mlSwimLaneEmbeddable_${embeddableContext.id}`}
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
            setFromPage(update.fromPage);
          }
          if (update.perPage) {
            setFromPage(1);
            setPerPage(update.perPage);
          }
        }}
        isLoading={isLoading}
        noDataWarning={
          <EuiEmptyPrompt
            titleSize="xxs"
            style={{ padding: 0 }}
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
      />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableSwimLaneContainer;
