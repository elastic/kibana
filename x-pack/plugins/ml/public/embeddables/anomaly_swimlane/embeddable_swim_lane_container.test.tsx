/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { EmbeddableSwimLaneContainer } from './embeddable_swim_lane_container';
import { BehaviorSubject, Observable } from 'rxjs';
import { I18nProvider } from '@kbn/i18n/react';
import {
  AnomalySwimlaneEmbeddableInput,
  AnomalySwimlaneServices,
} from './anomaly_swimlane_embeddable';
import { CoreStart } from 'kibana/public';
import { MlStartDependencies } from '../../plugin';
import { useSwimlaneInputResolver } from './swimlane_input_resolver';
import { SWIMLANE_TYPE } from '../../application/explorer/explorer_constants';
import { SwimlaneContainer } from '../../application/explorer/swimlane_container';

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
  let embeddableInput: BehaviorSubject<Partial<AnomalySwimlaneEmbeddableInput>>;
  let refresh: BehaviorSubject<any>;
  let services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];
  const onInputChange = jest.fn();

  beforeEach(() => {
    embeddableInput = new BehaviorSubject({
      id: 'test-swimlane-embeddable',
    } as Partial<AnomalySwimlaneEmbeddableInput>);
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
      10,
      jest.fn(),
      {},
      false,
      null,
    ]);

    render(
      <EmbeddableSwimLaneContainer
        id={'test-swimlane-embeddable'}
        embeddableInput={
          embeddableInput.asObservable() as Observable<AnomalySwimlaneEmbeddableInput>
        }
        services={services}
        refresh={refresh}
        onInputChange={onInputChange}
      />,
      defaultOptions
    );

    const calledWith = ((SwimlaneContainer as unknown) as jest.Mock<typeof SwimlaneContainer>).mock
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
      undefined,
      undefined,
      false,
      { message: 'Something went wrong' },
    ]);

    const { findByText } = render(
      <EmbeddableSwimLaneContainer
        id={'test-swimlane-embeddable'}
        embeddableInput={
          embeddableInput.asObservable() as Observable<AnomalySwimlaneEmbeddableInput>
        }
        services={services}
        refresh={refresh}
        onInputChange={onInputChange}
      />,
      defaultOptions
    );
    const errorMessage = await findByText('Something went wrong');
    expect(errorMessage).toBeDefined();
  });
});
