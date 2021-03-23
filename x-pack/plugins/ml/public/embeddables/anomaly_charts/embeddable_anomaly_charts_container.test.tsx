/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  EmbeddableAnomalyChartsContainer,
  EmbeddableAnomalyChartsContainerProps,
} from './embeddable_anomaly_charts_container';
import { BehaviorSubject, Observable } from 'rxjs';
import { I18nProvider } from '@kbn/i18n/react';
import { AnomalyChartsEmbeddable } from './anomaly_charts_embeddable';
import { CoreStart } from 'kibana/public';
import { useAnomalyChartsInputResolver } from './use_anomaly_charts_input_resolver';
import { MlDependencies } from '../../application/app';
import { TriggerContract } from 'src/plugins/ui_actions/public/triggers';
import { AnomalyChartsEmbeddableInput, AnomalyChartsServices } from '..';
import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts/explorer_anomalies_container';
import {
  anomalyDetectorServiceMock,
  anomalyExplorerChartsServiceMock,
  coreStartMock,
  mlStartMock,
} from './__mocks__/services';
import { mlResultsServiceMock } from '../../application/services/ml_results_service';

jest.mock('./use_anomaly_charts_input_resolver', () => ({
  useAnomalyChartsInputResolver: jest.fn(() => {
    return [];
  }),
}));

jest.mock('../../application/explorer/explorer_charts/explorer_anomalies_container', () => ({
  ExplorerAnomaliesContainer: jest.fn(() => {
    return null;
  }),
}));

const defaultOptions = { wrapper: I18nProvider };

describe('EmbeddableAnomalyChartsContainer', () => {
  let embeddableInput: BehaviorSubject<Partial<AnomalyChartsEmbeddableInput>>;
  let refresh: BehaviorSubject<any>;
  let services: jest.Mocked<[CoreStart, MlDependencies, AnomalyChartsServices]>;
  let embeddableContext: jest.Mocked<AnomalyChartsEmbeddable>;
  let trigger: jest.Mocked<TriggerContract>;

  const onInputChange = jest.fn();
  const onOutputChange = jest.fn();

  const mockedInput = {
    viewMode: 'view',
    filters: [],
    hidePanelTitles: false,
    query: {
      language: 'lucene',
      query: 'instance:i-d**',
    },
    timeRange: {
      from: 'now-3y',
      to: 'now',
    },
    refreshConfig: {
      value: 0,
      pause: true,
    },
    id: 'b5b2f600-9c7e-4f7d-8b82-ee156fffad27',
    searchSessionId: 'e8d052f8-0d9a-4d80-819d-fe18d9b314fa',
    syncColors: true,
    title: 'ML anomaly explorer charts for cw_multi_1',
    jobIds: ['cw_multi_1'],
    maxSeriesToPlot: 12,
    enhancements: {},
    severity: 50,
    severityThreshold: 75,
  } as AnomalyChartsEmbeddableInput;

  beforeEach(() => {
    // we only want to mock some of the functions needed
    // @ts-ignore
    embeddableContext = {
      id: 'test-id',
      getInput: jest.fn(),
    };
    embeddableContext.getInput.mockReturnValue(mockedInput);

    embeddableInput = new BehaviorSubject({
      id: 'test-explorer-charts-embeddable',
    } as Partial<AnomalyChartsEmbeddableInput>);

    trigger = ({ exec: jest.fn() } as unknown) as jest.Mocked<TriggerContract>;

    mlStartMock.uiActions.getTrigger.mockReturnValue(trigger);

    services = ([
      coreStartMock,
      mlStartMock,
      {
        anomalyDetectorService: anomalyDetectorServiceMock,
        anomalyExplorerChartsService: anomalyExplorerChartsServiceMock,
        mlResultsService: mlResultsServiceMock,
      },
    ] as unknown) as EmbeddableAnomalyChartsContainerProps['services'];
  });

  test('should render explorer charts with a valid embeddable input', async () => {
    const chartsData = {
      chartsPerRow: 2,
      seriesToPlot: [],
      tooManyBuckets: false,
      timeFieldName: '@timestamp',
      errorMessages: undefined,
    };

    (useAnomalyChartsInputResolver as jest.Mock).mockReturnValueOnce({
      chartsData,
      isLoading: false,
      error: undefined,
    });

    render(
      <EmbeddableAnomalyChartsContainer
        id={'test-explorer-charts-embeddable'}
        embeddableContext={embeddableContext}
        embeddableInput={embeddableInput.asObservable() as Observable<AnomalyChartsEmbeddableInput>}
        services={services}
        refresh={refresh}
        onInputChange={onInputChange}
        onOutputChange={onOutputChange}
      />,
      defaultOptions
    );

    const calledWith = ((ExplorerAnomaliesContainer as unknown) as jest.Mock<
      typeof ExplorerAnomaliesContainer
    >).mock.calls[0][0];

    expect(calledWith).toMatchSnapshot();
  });

  test('should render an error in case it could not fetch the ML charts data', async () => {
    (useAnomalyChartsInputResolver as jest.Mock).mockReturnValueOnce({
      chartsData: undefined,
      isLoading: false,
      error: 'No anomalies',
    });

    const { findByText } = render(
      <EmbeddableAnomalyChartsContainer
        embeddableContext={embeddableContext}
        id={'test-explorer-charts-embeddable'}
        embeddableInput={embeddableInput.asObservable() as Observable<AnomalyChartsEmbeddableInput>}
        services={services}
        refresh={refresh}
        onInputChange={onInputChange}
        onOutputChange={onOutputChange}
      />,
      defaultOptions
    );
    const errorMessage = await findByText('Unable to load the ML anomaly explorer data');
    expect(errorMessage).toBeDefined();
  });
});
