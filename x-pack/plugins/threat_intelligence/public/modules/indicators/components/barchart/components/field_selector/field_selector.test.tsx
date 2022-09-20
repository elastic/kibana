/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { TestProvidersComponent } from '../../../../../../common/mocks/test_providers';
import { DROPDOWN_TEST_ID, IndicatorFieldSelector } from '.';

const mockIndexPattern: DataView = {
  fields: [
    {
      name: '@timestamp',
      type: 'date',
    } as DataViewField,
    {
      name: 'threat.feed.name',
      type: 'string',
    } as DataViewField,
  ],
} as DataView;

describe('<IndicatorFieldSelector />', () => {
  it('should handle empty array of indexPatterns', () => {
    const component = render(
      <TestProvidersComponent>
        <IndicatorFieldSelector
          indexPattern={{ fields: [] } as any}
          // eslint-disable-next-line no-console
          valueChange={(value: string) => console.log(value)}
        />
      </TestProvidersComponent>
    );

    expect(component).toMatchSnapshot();
  });

  it('should display all unique fields from a DataView[]', () => {
    const component = render(
      <TestProvidersComponent>
        <IndicatorFieldSelector
          indexPattern={mockIndexPattern}
          // eslint-disable-next-line no-console
          valueChange={(value: string) => console.log(value)}
        />
      </TestProvidersComponent>
    );

    expect(component).toMatchSnapshot();

    const dropdownOptions: string = component.getByTestId(DROPDOWN_TEST_ID).innerHTML;
    const optionsCount: number = (dropdownOptions.match(/<option/g) || []).length;
    const mockFieldsCount: number = mockIndexPattern.fields.length;

    expect(optionsCount).toBe(mockFieldsCount);
  });
});
