/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useState, useEffect, useMemo } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { Observable } from 'rxjs';

import { CoreStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { IAnomalyExplorerEmbeddable } from './anomaly_explorer_embeddable';
import { useExplorerInputResolver, useSwimlaneInputResolver } from './explorer_input_resolver';
import { SwimlaneType } from '../../application/explorer/explorer_constants';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';
import { AppStateSelectedCells } from '../../application/explorer/explorer_utils';
import { MlDependencies } from '../../application/app';
import { SWIM_LANE_SELECTION_TRIGGER } from '../../ui_actions';
import {
  AnomalyExplorerEmbeddableInput,
  AnomalyExplorerEmbeddableOutput,
  AnomalyExplorerServices,
} from '..';
import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts_container';
import { ML_APP_URL_GENERATOR } from '../../../common/constants/ml_url_generator';
import { optionValueToThreshold } from '../../application/components/controls/select_severity/select_severity';
import { ANOMALY_THRESHOLD } from '../../../common';

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableContext: InstanceType<IAnomalyExplorerEmbeddable>;
  embeddableInput: Observable<AnomalyExplorerEmbeddableInput>;
  // @TODO:replace with AnomalyExplorerEmbeddableServices
  services: [CoreStart, MlDependencies, AnomalyExplorerServices];
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
  const [fromPage, setFromPage] = useState<number>(1);
  const [severity, setSeverity] = useState(optionValueToThreshold(ANOMALY_THRESHOLD.MINOR));

  const [
    {},
    {
      uiActions,
      data: dataServices,
      share: {
        urlGenerators: { getUrlGenerator },
      },
    },
  ] = services;
  const { timefilter } = dataServices.query.timefilter;

  const [selectedCells, setSelectedCells] = useState<AppStateSelectedCells | undefined>();
  const mlUrlGenerator = useMemo(() => getUrlGenerator(ML_APP_URL_GENERATOR), [getUrlGenerator]);

  const [
    swimlaneType,
    swimlaneData,
    perPage,
    setPerPage,
    timeBuckets,
    isSwimlaneLoading,
    error,
  ] = useSwimlaneInputResolver(
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
    fromPage,
    selectedCells,
    severity.val
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
      style={{
        width: '100%',
        overflowY: 'scroll',
        padding: '8px',
      }}
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
        isLoading={isSwimlaneLoading}
        noDataWarning={
          <FormattedMessage
            id="xpack.ml.swimlaneEmbeddable.noDataFound"
            defaultMessage="No anomalies found"
          />
        }
      />
      {chartsData && (
        <>
          <EuiSpacer />
          <ExplorerAnomaliesContainer
            showCharts={true}
            chartsData={chartsData}
            severity={severity}
            setSeverity={setSeverity}
            mlUrlGenerator={mlUrlGenerator}
            timeBuckets={timeBuckets}
            timefilter={timefilter}
          />
        </>
      )}
    </div>
  );
};

// required for dynamic import using React.lazy()
// eslint-disable-next-line import/no-default-export
export default EmbeddableExplorerContainer;
