/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { render } from '@testing-library/react';
import { FilterInOut, IN_ICON_TEST_ID, OUT_ICON_TEST_ID } from './filter_in_out';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { EuiButtonIcon } from '@elastic/eui';
import { useIndicatorsFiltersContext } from '../../../indicators/hooks/use_indicators_filters_context';
import { mockIndicatorsFiltersContext } from '../../../../common/mocks/mock_indicators_filters_context';

jest.mock('../../../indicators/hooks/use_indicators_filters_context');

const mockIndicator: Indicator = generateMockIndicator();

const mockField: string = 'threat.feed.name';

describe('<FilterInOut />', () => {
  beforeEach(() => {
    (
      useIndicatorsFiltersContext as jest.MockedFunction<typeof useIndicatorsFiltersContext>
    ).mockReturnValue(mockIndicatorsFiltersContext);
  });

  it('should render two EuiButtonIcon', () => {
    const component = render(<FilterInOut data={mockIndicator} field={mockField} />);

    expect(component.getByTestId(IN_ICON_TEST_ID)).toBeInTheDocument();
    expect(component.getByTestId(OUT_ICON_TEST_ID)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it('should render two Component (for DataGrid use)', () => {
    const mockComponent: FunctionComponent = () => <EuiButtonIcon iconType="plusInCircle" />;

    const component = render(
      <FilterInOut data={mockIndicator} field={mockField} as={mockComponent} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render an empty component (wrong data input)', () => {
    const component = render(<FilterInOut data={''} field={mockField} />);

    expect(component).toMatchSnapshot();
  });

  it('should render an empty component (wrong field input)', () => {
    const component = render(<FilterInOut data={mockIndicator} field={''} />);

    expect(component).toMatchSnapshot();
  });
});
