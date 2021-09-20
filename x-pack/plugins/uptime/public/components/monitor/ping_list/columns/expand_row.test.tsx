/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';

import { makePing } from '../../../../../common/runtime_types';

import { render } from '../../../../lib/helper/rtl_helpers';
import { ExpandRowColumn } from './expand_row';

import { Ping } from '../../../../../common/runtime_types/ping';

describe('ExpandRowColumn', () => {
  const defaultPing = makePing({
    docId: 'test',
  });
  const pingWithError = {
    ...defaultPing,
    error: true,
  };
  const pingWithoutResponseBody = {
    ...defaultPing,
    http: {
      response: {
        body: {
          bytes: 0,
        },
      },
    },
  };
  const pingWithResponseBody = {
    ...defaultPing,
    http: {
      response: {
        body: {
          bytes: 1,
        },
      },
    },
  };
  const browserPing = {
    ...defaultPing,
    type: 'browser',
  };
  const onChange = jest.fn();
  const defaultExpandedRows = {
    test: <p>Test row</p>,
  };

  it.each([
    [defaultExpandedRows, 'Collapse'],
    [{}, 'Expand'],
  ])('renders correctly', (expandedRows, labelText) => {
    render(
      <ExpandRowColumn item={defaultPing} expandedRows={expandedRows} setExpandedRows={onChange} />
    );
    expect(screen.getByRole('button', { name: labelText }));
  });

  it.each([[defaultPing], [pingWithoutResponseBody], [browserPing]])(
    'disables expand button for pings without error, without response body, or browser pings',
    (ping) => {
      render(<ExpandRowColumn item={ping as Ping} expandedRows={{}} setExpandedRows={onChange} />);
      expect(screen.getByRole('button', { name: 'Expand' })).toHaveAttribute('disabled');
    }
  );

  it.each([[pingWithError], [pingWithResponseBody]])(
    'enables expand button for pings with error and response body',
    (ping) => {
      render(<ExpandRowColumn item={ping as Ping} expandedRows={{}} setExpandedRows={onChange} />);
      expect(screen.getByRole('button', { name: 'Expand' })).not.toHaveAttribute('disabled');
    }
  );
});
