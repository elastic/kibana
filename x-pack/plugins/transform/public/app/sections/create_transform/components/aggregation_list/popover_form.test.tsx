/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { shallow } from 'enzyme';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { AggName } from '../../../../../../common/types/aggregations';
import { PIVOT_SUPPORTED_AGGS } from '../../../../../../common/types/pivot_aggs';
import { PivotAggsConfig } from '../../../../common';
import { PopoverForm } from './popover_form';
import { I18nProvider } from '@kbn/i18n-react';

describe('Transform: Aggregation <PopoverForm />', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Minimal initialization', () => {
    const defaultData: PivotAggsConfig = {
      agg: PIVOT_SUPPORTED_AGGS.CARDINALITY,
      aggName: 'the-group-by-agg-name',
      dropDownName: 'the-group-by-drop-down-name',
      field: 'the-field',
    };
    const otherAggNames: AggName[] = [];
    const onChange = (item: PivotAggsConfig) => {};

    const wrapper = shallow(
      <PopoverForm
        defaultData={defaultData}
        otherAggNames={otherAggNames}
        options={{}}
        onChange={onChange}
      />
    );

    expect(wrapper).toMatchSnapshot();
  });

  test('preserves the field for unsupported aggs', async () => {
    const mockOnChange = jest.fn();
    const { getByTestId } = render(
      <I18nProvider>
        <PopoverForm
          defaultData={{
            field: 'AvgTicketPrice',
            keyed: true,
            ranges: [
              {
                to: 500,
              },
              {
                from: 500,
                to: 700,
              },
              {
                from: 700,
              },
            ],
            // @ts-ignore
            agg: 'range',
            aggName: 'AvgTicketPrice.ranges',
            dropDownName: 'AvgTicketPrice.ranges',
          }}
          otherAggNames={[]}
          options={{}}
          onChange={mockOnChange}
        />
      </I18nProvider>
    );

    const aggNameInput = getByTestId('transformAggName');
    fireEvent.change(aggNameInput, {
      target: { value: 'betterName' },
    });

    const applyButton = getByTestId('transformApplyAggChanges');
    fireEvent.click(applyButton);

    expect(mockOnChange).toHaveBeenCalledTimes(1);
    expect(mockOnChange).toHaveBeenCalledWith({
      field: 'AvgTicketPrice',
      keyed: true,
      ranges: [
        {
          to: 500,
        },
        {
          from: 500,
          to: 700,
        },
        {
          from: 700,
        },
      ],
      // @ts-ignore
      agg: 'range',
      aggName: 'betterName',
      dropDownName: 'AvgTicketPrice.ranges',
    });
  });
});
