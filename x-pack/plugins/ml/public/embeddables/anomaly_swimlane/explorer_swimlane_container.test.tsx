/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ExplorerSwimlaneContainer } from './explorer_swimlane_container';
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

jest.mock('./swimlane_input_resolver', () => ({
  useSwimlaneInputResolver: jest.fn(() => {
    return [];
  }),
}));

jest.mock('../../application/explorer/explorer_swimlane', () => ({
  ExplorerSwimlane: jest.fn(),
}));

jest.mock('../../application/components/chart_tooltip', () => ({
  MlTooltipComponent: jest.fn(),
}));

const defaultOptions = { wrapper: I18nProvider };

describe('ExplorerSwimlaneContainer', () => {
  let embeddableInput: BehaviorSubject<Partial<AnomalySwimlaneEmbeddableInput>>;
  let refresh: BehaviorSubject<any>;
  let services: [CoreStart, MlStartDependencies, AnomalySwimlaneServices];

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
      mockOverallData,
      SWIMLANE_TYPE.OVERALL,
      undefined,
    ]);

    const { findByTestId } = render(
      <ExplorerSwimlaneContainer
        id={'test-swimlane-embeddable'}
        embeddableInput={
          embeddableInput.asObservable() as Observable<AnomalySwimlaneEmbeddableInput>
        }
        services={services}
        refresh={refresh}
      />,
      defaultOptions
    );
    expect(
      await findByTestId('mlMaxAnomalyScoreEmbeddable_test-swimlane-embeddable')
    ).toBeDefined();
  });

  test('should render an error in case it could not fetch the ML swimlane data', async () => {
    (useSwimlaneInputResolver as jest.Mock).mockReturnValueOnce([
      undefined,
      undefined,
      undefined,
      { message: 'Something went wrong' },
    ]);

    const { findByText } = render(
      <ExplorerSwimlaneContainer
        id={'test-swimlane-embeddable'}
        embeddableInput={
          embeddableInput.asObservable() as Observable<AnomalySwimlaneEmbeddableInput>
        }
        services={services}
        refresh={refresh}
      />,
      defaultOptions
    );
    const errorMessage = await findByText('Something went wrong');
    expect(errorMessage).toBeDefined();
  });

  test('should render a loading indicator during the data fetching', async () => {
    const { findByTestId } = render(
      <ExplorerSwimlaneContainer
        id={'test-swimlane-embeddable'}
        embeddableInput={
          embeddableInput.asObservable() as Observable<AnomalySwimlaneEmbeddableInput>
        }
        services={services}
        refresh={refresh}
      />,
      defaultOptions
    );
    expect(
      await findByTestId('loading_mlMaxAnomalyScoreEmbeddable_test-swimlane-embeddable')
    ).toBeDefined();
  });
});
