/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../lib/helper/rtl_helpers';
import { FilterGroup } from './filter_group';
import * as Hooks from '@kbn/observability-plugin/public/hooks/use_values_list';

describe('FilterGroup', () => {
  it.each([
    ['expands filter group for Location filter'],
    ['expands filter group for Port filter'],
    ['expands filter group for Scheme filter'],
    ['expands filter group for Tag filter'],
  ])('handles loading', async (popoverButtonLabel) => {
    jest.spyOn(Hooks, 'useValuesList').mockReturnValue({
      values: [],
      loading: true,
    });
    const { getByLabelText, getAllByText } = render(<FilterGroup />);

    await waitFor(() => {
      const popoverButton = getByLabelText(popoverButtonLabel);
      fireEvent.click(popoverButton);
    });
    await waitFor(() => {
      expect(getAllByText('Loading options')).toHaveLength(2);
    });
  });

  it.each([
    [
      'expands filter group for Location filter',
      [
        [
          {
            label: 'Fairbanks',
            count: 10,
          },
          {
            label: 'NYC',
            count: 2,
          },
        ],
        [],
        [],
        [],
      ],
    ],
    [
      'expands filter group for Port filter',
      [
        [],
        [
          { label: '80', count: 12 },
          { label: '443', count: 8 },
        ],
        [],
        [],
      ],
    ],
    [
      'expands filter group for Scheme filter',
      [
        [],
        [],
        [
          { label: 'HTTP', count: 15 },
          { label: 'TCP', count: 10 },
        ],
        [],
      ],
    ],
    [
      'expands filter group for Tag filter',
      [
        [],
        [],
        [],
        [
          { label: 'test', count: 23 },
          { label: 'prod', count: 10 },
        ],
      ],
    ],
  ])('displays filter item counts when clicked', async (popoverButtonLabel, values) => {
    const spy = jest.spyOn(Hooks, 'useValuesList');
    for (let i = 0; i < 4; i++) {
      spy.mockReturnValueOnce({
        values: values[i],
        loading: false,
      });
    }

    const { getByLabelText, getAllByLabelText } = render(<FilterGroup />);

    await waitFor(() => {
      const popoverButton = getByLabelText(popoverButtonLabel);
      fireEvent.click(popoverButton);
    });

    expect(getByLabelText('2 available filters'));
    expect(getAllByLabelText('0 available filters')).toHaveLength(3);
  });
});
