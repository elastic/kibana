/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import { Simulate } from 'react-dom/test-utils';
import React from 'react';
import type { AlertWorkflowStatus } from '../../../../../common/typings';
import { WorkflowStatusFilter } from './workflow_status_filter';

describe('StatusFilter', () => {
  describe('render', () => {
    it('renders', () => {
      const onChange = jest.fn();
      const status: AlertWorkflowStatus = 'open';
      const props = { onChange, status };

      expect(() => render(<WorkflowStatusFilter {...props} />)).not.toThrowError();
    });

    (['open', 'acknowledged', 'closed'] as AlertWorkflowStatus[]).map((status) => {
      describe(`when clicking the ${status} button`, () => {
        it('calls the onChange callback with "${status}"', () => {
          const onChange = jest.fn();
          const props = { onChange, status };

          const { getByTestId } = render(<WorkflowStatusFilter {...props} />);
          const button = getByTestId(`workflowStatusFilterButton-${status}`);
          const input = button.querySelector('input') as Element;

          Simulate.change(input);

          expect(onChange).toHaveBeenCalledWith(status);
        });
      });
    });
  });
});
