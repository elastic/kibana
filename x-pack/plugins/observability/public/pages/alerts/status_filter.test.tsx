/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';
import type { AlertStatus } from '../../../common/typings';
import { StatusFilter } from './status_filter';

describe('StatusFilter', () => {
  describe('render', () => {
    it('renders', () => {
      const onChange = jest.fn();
      const status: AlertStatus = 'all';
      const props = { onChange, status };

      expect(() => render(<StatusFilter {...props} />)).not.toThrowError();
    });

    (['all', 'open', 'closed'] as AlertStatus[]).map((status) => {
      describe(`when clicking the ${status} button`, () => {
        it('calls the onChange callback with "${status}"', () => {
          const onChange = jest.fn();
          const props = { onChange, status };

          const { getByTestId } = render(<StatusFilter {...props} />);
          const button = getByTestId(`StatusFilter ${status} button`);

          button.click();

          expect(onChange).toHaveBeenCalledWith(status);
        });
      });
    });
  });
});
