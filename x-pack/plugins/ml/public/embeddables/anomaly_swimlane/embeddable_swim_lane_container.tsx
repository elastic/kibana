/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useState } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { Observable } from 'rxjs';

import { CoreStart } from 'kibana/public';
import { FormattedMessage } from '@kbn/i18n/react';
import { MlStartDependencies } from '../../plugin';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneEmbeddableOutput,
  AnomalySwimlaneServices,
} from './anomaly_swimlane_embeddable';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import { SwimlaneType } from '../../application/explorer/explorer_constants';
import {
  isViewBySwimLaneData,
  SwimlaneContainer,
} from '../../application/explorer/swimlane_container';

export interface ExplorerSwimlaneContainerProps {
  id: string;
  embeddableInput: Observable<AnomalySwimlaneEmbeddableInput>;
  services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];
  refresh: Observable<any>;
  onInputChange: (output: Partial<AnomalySwimlaneEmbeddableOutput>) => void;
}

export const EmbeddableSwimLaneContainer: FC<ExplorerSwimlaneContainerProps> = ({
  id,
  embeddableInput,
  services,
  refresh,
  onInputChange,
}) => {
  const [chartWidth, setChartWidth] = useState<number>(0);
  const [fromPage, setFromPage] = useState<number>(1);

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
        timeBuckets={timeBuckets}
        swimlaneData={swimlaneData!}
        swimlaneType={swimlaneType as SwimlaneType}
        fromPage={fromPage}
        perPage={perPage}
        swimlaneLimit={isViewBySwimLaneData(swimlaneData) ? swimlaneData.cardinality : undefined}
        onResize={(width) => {
          setChartWidth(width);
        }}
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
