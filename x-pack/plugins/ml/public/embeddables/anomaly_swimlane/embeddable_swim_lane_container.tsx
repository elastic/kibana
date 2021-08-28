/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import type { FC } from 'react';
import React, { useCallback, useEffect, useState } from 'react';
import { Observable } from 'rxjs';
import type { CoreStart } from '../../../../../../src/core/public/types';
import type { MlDependencies } from '../../application/app';
import type { SwimlaneType } from '../../application/explorer/explorer_constants';
import type { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions/triggers';
import type {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from '../types';
import type { IAnomalySwimlaneEmbeddable } from './anomaly_swimlane_embeddable';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableContext: InstanceType<IAnomalySwimlaneEmbeddable>;
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>;
  services: [CoreStart, MlDependencies, AnomalySwimlaneServices];
  refresh: Observable<any>;
  onInputChange: (input: Partial<AnomalySwimlaneEmbeddableInput>) => void;
  onOutputChange: (output: Partial<AnomalySwimlaneEmbeddableOutput>) => void;
}

export const EmbeddableSwimLaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  embeddableContext,
  embeddableInput,
  services,
  refresh,
  onInputChange,
  onOutputChange,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);

  const [fromPage, setFromPage] = useState<number>(1);

  const [{}, { uiActions }] = services;

  const [selectedCells, setSelectedCells] = useState<AppStateSelectedCells | undefined>();

  const [
    swimlaneType,
    swimlaneData,
    perPage,
    setPerPage,
    timeBuckets,
    isLoading,
    error,
  ] = useSwimlaneInputResolver(
    embeddableInput,
    onInputChange,
    refresh,
    services,
    chartWidth,
    fromPage
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
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.noDataFound"
            defaultMessage="No anomalies found"
          />
        }
      />
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableSwimLaneContainer;
