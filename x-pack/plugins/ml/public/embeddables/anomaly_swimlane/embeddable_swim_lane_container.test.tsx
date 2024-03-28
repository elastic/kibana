/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { I18nProvider } from '@kbn/i18n-react';
import type { TriggerContract } from '@kbn/ui-actions-plugin/public/triggers';
import { render } from '@testing-library/react';
import React from 'react';
import { BehaviorSubject } from 'rxjs';
import type { AnomalySwimlaneServices } from '..';
import type { MlDependencies } from '../../application/app';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import { SwimlaneContainer } from '../../application/explorer/swimlane_container';
import { createCoreStartMock } from '../../__mocks__/core_start';
import { createMlStartDepsMock } from '../../__mocks__/ml_start_deps';
import type { ExplorerSwimlaneContainerProps } from './embeddable_swim_lane_container';
import { EmbeddableSwimLaneContainer } from './embeddable_swim_lane_container';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import type { AnomalySwimLaneEmbeddableApi } from './types';

jest.mock('./swimlane_input_resolver', () => ({
  useSwimlaneInputResolver: jest.fn(() => {
    return [];
  }),
}));

jest.mock('../../application/explorer/swimlane_container', () => ({
  SwimlaneContainer: jest.fn(() => {
    return null;
  }),
  isViewBySwimLaneData: jest.fn(),
}));

const defaultOptions = { wrapper: I18nProvider };

describe('ExplorerSwimlaneContainer', () => {
  let api: AnomalySwimLaneEmbeddableApi;
  let refresh: BehaviorSubject<any>;
  let services: jest.Mocked<[CoreStart, MlDependencies, AnomalySwimlaneServices]>;
  let trigger: jest.Mocked<TriggerContract>;

  const onRenderComplete = jest.fn();
  const onLoading = jest.fn();
  const onError = jest.fn();

  beforeEach(() => {
    api = {
      jobIds: new BehaviorSubject(['test-job']),
      swimlaneType: new BehaviorSubject(SWIMLANE_TYPE.OVERALL),
      fromPage: new BehaviorSubject(1),
      perPage: new BehaviorSubject(10),
      setInterval: jest.fn(),
    } as unknown as AnomalySwimLaneEmbeddableApi;

    trigger = { exec: jest.fn() } as unknown as jest.Mocked<TriggerContract>;

    const mlStartMock = createMlStartDepsMock();
    mlStartMock.uiActions.getTrigger.mockReturnValue(trigger);

    services = [
      createCoreStartMock(),
      mlStartMock,
    ] as unknown as ExplorerSwimlaneContainerProps['services'];
  });

  test('should render a swimlane with a valid embeddable input', async () => {
    const mockOverallData = {
      laneLabels: ['Overall'],
      points: [
        {
          laneLabel: 'Overall',
          time: 1572825600,
          value: 55.00448,
        },
      ],
      interval: 345600,
      earliest: 1572134400,
      latest: 1588377599.999,
    };

    (useSwimlaneInputResolver as jest.Mock).mockReturnValueOnce([
      SWIMLANE_TYPE.OVERALL,
      mockOverallData,
      {},
      false,
      null,
    ]);

    render(
      <EmbeddableSwimLaneContainer
        id={'test-swimlane-embeddable'}
        api={api}
        services={services}
        refresh={refresh}
        onLoading={onLoading}
        onRenderComplete={onRenderComplete}
        onError={onError}
      />,
      defaultOptions
    );

    const calledWith = (SwimlaneContainer as unknown as jest.Mock<typeof SwimlaneContainer>).mock
      .calls[0][0];

    expect(calledWith).toMatchObject({
      perPage: 10,
      swimlaneType: SWIMLANE_TYPE.OVERALL,
      swimlaneData: mockOverallData,
      isLoading: false,
      swimlaneLimit: undefined,
      fromPage: 1,
    });
  });

  test('should render an error in case it could not fetch the ML swimlane data', async () => {
    (useSwimlaneInputResolver as jest.Mock).mockReturnValueOnce([
      undefined,
      undefined,
      undefined,
      false,
      { message: 'Something went wrong' },
    ]);

    const { findByText } = render(
      <EmbeddableSwimLaneContainer
        id={'test-swimlane-embeddable'}
        api={api}
        services={services}
        refresh={refresh}
        onLoading={onLoading}
        onRenderComplete={onRenderComplete}
        onError={onError}
      />,
      defaultOptions
    );
    const errorMessage = await findByText('Something went wrong');
    expect(errorMessage).toBeDefined();
  });
});
