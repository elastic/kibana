/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { LegendActionProps, SeriesIdentifier } from '@elastic/charts';
import { EuiPopover } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test/jest';
import { ComponentType, ReactWrapper } from 'enzyme';
import type { Datatable } from 'src/plugins/expressions/public';
import { getLegendAction } from './get_legend_action';
import { LegendActionPopover } from '../shared_components';

const table: Datatable = {
  type: 'datatable',
  columns: [
    { id: 'a', name: 'A', meta: { type: 'string' } },
    { id: 'b', name: 'B', meta: { type: 'number' } },
  ],
  rows: [
    { a: 'Hi', b: 2 },
    { a: 'Test', b: 4 },
    { a: 'Foo', b: 6 },
  ],
};

describe('getLegendAction', function () {
  let wrapperProps: LegendActionProps;
  const Component: ComponentType<LegendActionProps> = getLegendAction(table, jest.fn());
  let wrapper: ReactWrapper<LegendActionProps>;

  beforeAll(() => {
    wrapperProps = {
      color: 'rgb(109, 204, 177)',
      label: 'Bar',
      series: [
        {
          specId: 'donut',
          key: 'Bar',
        },
      ] as unknown as SeriesIdentifier[],
    };
  });

  it('is not rendered if row does not exist', () => {
    wrapper = mountWithIntl(<Component {...wrapperProps} />);
    expect(wrapper).toEqual({});
    expect(wrapper.find(EuiPopover).length).toBe(0);
  });

  it('is rendered if row is detected', () => {
    const newProps = {
      ...wrapperProps,
      label: 'Hi',
      series: [
        {
          specId: 'donut',
          key: 'Hi',
        },
      ] as unknown as SeriesIdentifier[],
    };
    wrapper = mountWithIntl(<Component {...newProps} />);
    expect(wrapper.find(EuiPopover).length).toBe(1);
    expect(wrapper.find(EuiPopover).prop('title')).toEqual('Hi, filter options');
    expect(wrapper.find(LegendActionPopover).prop('context')).toEqual({
      data: [
        {
          column: 0,
          row: 0,
          table,
          value: 'Hi',
        },
      ],
    });
  });
});
