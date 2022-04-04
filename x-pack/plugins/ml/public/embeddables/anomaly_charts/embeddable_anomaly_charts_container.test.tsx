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
import { BehaviorSubject, Observable, of } from 'rxjs';
import { I18nProvider } from '@kbn/i18n/react';
import { AnomalyChartsEmbeddable } from './anomaly_charts_embeddable';
import { CoreStart } from 'kibana/public';
import { useAnomalyChartsInputResolver } from './use_anomaly_charts_input_resolver';
import { MlDependencies } from '../../application/app';
import { TriggerContract } from 'src/plugins/ui_actions/public/triggers';
import { AnomalyChartsEmbeddableInput, AnomalyChartsServices } from '..';
import { ExplorerAnomaliesContainer } from '../../application/explorer/explorer_charts/explorer_anomalies_container';
import { createMlResultsServiceMock } from '../../application/services/ml_results_service';
import { createCoreStartMock } from '../../__mocks__/core_start';
import { createMlStartDepsMock } from '../../__mocks__/ml_start_deps';
import { createAnomalyExplorerChartsServiceMock } from '../../application/services/__mocks__/anomaly_explorer_charts_service';
import { createAnomalyDetectorServiceMock } from '../../application/services/__mocks__/anomaly_detector_service';

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
  const onRenderComplete = jest.fn();
  const onLoading = jest.fn();
  const onError = jest.fn();

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

    trigger = { exec: jest.fn() } as unknown as jest.Mocked<TriggerContract>;

    const mlStartMock = createMlStartDepsMock();
    mlStartMock.uiActions.getTrigger.mockReturnValue(trigger);

    const coreStartMock = createCoreStartMock();
    const anomalyDetectorServiceMock = createAnomalyDetectorServiceMock();

    anomalyDetectorServiceMock.getJobs$.mockImplementation((jobId: string[]) => {
      if (jobId.includes('invalid-job-id')) {
        throw new Error('Invalid job');
      }
      return of([
        {
          job_id: 'cw_multi_1',
          analysis_config: { bucket_span: '15m' },
        },
      ]);
    });

    services = [
      coreStartMock,
      mlStartMock,
      {
        anomalyDetectorService: anomalyDetectorServiceMock,
        anomalyExplorerChartsService: createAnomalyExplorerChartsServiceMock(),
        mlResultsService: createMlResultsServiceMock(),
      },
    ] as unknown as EmbeddableAnomalyChartsContainerProps['services'];
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
        onLoading={onLoading}
        onRenderComplete={onRenderComplete}
        onError={onError}
      />,
      defaultOptions
    );

    const calledWith = (
      ExplorerAnomaliesContainer as unknown as jest.Mock<typeof ExplorerAnomaliesContainer>
    ).mock.calls[0][0];

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
        onLoading={onLoading}
        onRenderComplete={onRenderComplete}
        onError={onError}
      />,
      defaultOptions
    );
    const errorMessage = await findByText('Unable to load the ML anomaly explorer data');
    expect(errorMessage).toBeDefined();
  });
});
