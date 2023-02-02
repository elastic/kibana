/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render } from '@testing-library/react';
import { kpiHostMetricLensAttributes } from './lens_attributes/hosts/kpi_host_metric';
import { VisualizationEmbeddable } from './visualization_embeddable';
import * as inputActions from '../../store/inputs/actions';
import { InputsModelId } from '../../store/inputs/constants';
import {
  createSecuritySolutionStorageMock,
  kibanaObservable,
  mockGlobalState,
  SUB_PLUGINS_REDUCER,
  TestProviders,
} from '../../mock';
import { createStore } from '../../store';
import type { State } from '../../store';
import { useRefetchByRestartingSession } from '../page/use_refetch_by_session';
import { getRiskScoreDonutAttributes } from './lens_attributes/common/risk_scores/risk_score_donut';
import { TOTAL_LABEL } from '../../../overview/components/entity_analytics/common/translations';

jest.mock('./lens_embeddable');
jest.mock('../page/use_refetch_by_session', () => ({
  useRefetchByRestartingSession: jest.fn(),
}));

let res: RenderResult;
const mockSearchSessionId = 'mockSearchSessionId';
const mockSearchSessionIdDefault = 'mockSearchSessionIdDefault';
const mockRefetchByRestartingSession = jest.fn();
const mockSetQuery = jest.spyOn(inputActions, 'setQuery');
const mockDeleteQuery = jest.spyOn(inputActions, 'deleteOneQuery');
const state: State = {
  ...mockGlobalState,
};
const { storage } = createSecuritySolutionStorageMock();
const store = createStore(state, SUB_PLUGINS_REDUCER, kibanaObservable, storage);
describe('VisualizationEmbeddable', () => {
  describe('when isDonut = false', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useRefetchByRestartingSession as jest.Mock).mockReturnValue({
        session: {
          current: {
            start: jest
              .fn()
              .mockReturnValueOnce(mockSearchSessionId)
              .mockReturnValue(mockSearchSessionIdDefault),
          },
        },
        refetchByRestartingSession: mockRefetchByRestartingSession,
      });
      res = render(
        <TestProviders store={store}>
          <VisualizationEmbeddable
            id="testId"
            lensAttributes={kpiHostMetricLensAttributes}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
    });

    it('should render LensEmbeddable', () => {
      expect(res.getByTestId('lens-embeddable')).toBeInTheDocument();
    });

    it('should set query', () => {
      expect(mockSetQuery).toHaveBeenCalledTimes(1);
      expect(mockSetQuery).toHaveBeenCalledWith({
        inputId: InputsModelId.global,
        id: 'testId',
        searchSessionId: mockSearchSessionId,
        refetch: mockRefetchByRestartingSession,
        loading: false,
        inspect: null,
      });
    });

    it('should delete query when unmount', () => {
      res.unmount();
      expect(mockDeleteQuery).toHaveBeenCalledWith({
        inputId: InputsModelId.global,
        id: 'testId',
      });
    });
  });

  describe('when isDonut = true', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useRefetchByRestartingSession as jest.Mock).mockReturnValue({
        session: {
          current: {
            start: jest
              .fn()
              .mockReturnValueOnce(mockSearchSessionId)
              .mockReturnValue(mockSearchSessionIdDefault),
          },
        },
        refetchByRestartingSession: mockRefetchByRestartingSession,
      });
      res = render(
        <TestProviders store={store}>
          <VisualizationEmbeddable
            getLensAttributes={getRiskScoreDonutAttributes}
            id="testId"
            isDonut={true}
            label={TOTAL_LABEL}
            timerange={{ from: '2022-10-27T23:00:00.000Z', to: '2022-11-04T10:46:16.204Z' }}
          />
        </TestProviders>
      );
    });

    it('should render donut wrapper ', () => {
      expect(res.getByTestId('donut-chart')).toBeInTheDocument();
    });
  });
});
