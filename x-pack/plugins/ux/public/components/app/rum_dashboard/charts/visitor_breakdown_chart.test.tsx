/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  getVisitorBreakdownLensAttributes,
  VisitorBreakdownChart,
} from './visitor_breakdown_chart';
import { useKibanaServices } from '../../../../hooks/use_kibana_services';

jest.mock('../../../../hooks/use_kibana_services');

describe('VisitorBreakdownChart', () => {
  describe('getVisitorBreakdownLensAttributes', () => {
    test('generates expected lens attributes', () => {
      const props = {
        metric: 'user_agent.os.name',
        uiFilters: {
          environment: 'ENVIRONMENT_ALL',
        },
        urlQuery: 'elastic.co',
        dataView: { id: 'Required' },
      };

      expect(getVisitorBreakdownLensAttributes(props)).toMatchSnapshot();
    });
  });

  describe('component', () => {
    const mockEmbeddableComponent = jest.fn(() => <></>);

    beforeEach(() => {
      jest.clearAllMocks();
      (useKibanaServices as jest.Mock).mockReturnValue({
        lens: {
          EmbeddableComponent: mockEmbeddableComponent,
        },
      });
    });

    test('calls lens with original attributes', () => {
      const props = {
        start: '0',
        end: '5000',
        metric: 'user_agent.os.name',
        uiFilters: {
          environment: 'ENVIRONMENT_ALL',
        },
        urlQuery: 'elastic.co',
        dataView: { id: 'Required' },
      };

      const { container } = render(<VisitorBreakdownChart {...props} />);

      expect(mockEmbeddableComponent.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          timeRange: {
            from: props.start,
            to: props.end,
          },
          attributes: getVisitorBreakdownLensAttributes(props),
        })
      );
    });
  });
});
