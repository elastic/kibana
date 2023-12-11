/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import { TestProvidersComponent } from '../../../../mocks/test_providers';
import { IndicatorsFieldSelector } from './field_selector';
import { EuiComboBoxOptionOption } from '@elastic/eui';
import { DROPDOWN_TEST_ID } from './test_ids';

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

describe('<IndicatorsFieldSelector />', () => {
  it('should handle empty array of indexPatterns', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFieldSelector
          indexPattern={{ fields: [] } as any}
          // eslint-disable-next-line no-console
          valueChange={(value: EuiComboBoxOptionOption<string>) => console.log(value)}
        />
      </TestProvidersComponent>
    );

    expect(getByTestId(DROPDOWN_TEST_ID)).toBeInTheDocument();
  });

  it('should display all unique fields from a DataView[]', () => {
    const { getByTestId } = render(
      <TestProvidersComponent>
        <IndicatorsFieldSelector
          indexPattern={mockIndexPattern}
          // eslint-disable-next-line no-console
          valueChange={(value: EuiComboBoxOptionOption<string>) => console.log(value)}
        />
      </TestProvidersComponent>
    );

    expect(getByTestId(DROPDOWN_TEST_ID)).toBeInTheDocument();
  });
});
