/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { render } from '@testing-library/react';
import { EuiButtonIcon } from '@elastic/eui';
import { useIndicatorsFiltersContext } from '../../../indicators';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { mockIndicatorsFiltersContext } from '../../../../common/mocks/mock_indicators_filters_context';
import {
  FilterOutButtonEmpty,
  FilterOutButtonIcon,
  FilterOutCellAction,
  FilterOutContextMenu,
} from '.';

jest.mock('../../../indicators/hooks/use_filters_context');

const mockIndicator: Indicator = generateMockIndicator();

const mockField: string = 'threat.feed.name';

const mockTestId: string = 'abc';

describe('<FilterOutButtonIcon /> <FilterOutButtonEmpty /> <FilterOutContextMenu /> <FilterOutDataGrid />', () => {
  beforeEach(() => {
    (
      useIndicatorsFiltersContext as jest.MockedFunction<typeof useIndicatorsFiltersContext>
    ).mockReturnValue(mockIndicatorsFiltersContext);
  });

  it('should render an empty component (wrong data input)', () => {
    const component = render(<FilterOutButtonIcon data={''} field={mockField} />);

    expect(component).toMatchSnapshot();
  });

  it('should render an empty component (wrong field input)', () => {
    const component = render(<FilterOutButtonIcon data={mockIndicator} field={''} />);

    expect(component).toMatchSnapshot();
  });

  it('should render one EuiButtonIcon', () => {
    const component = render(
      <FilterOutButtonIcon data={mockIndicator} field={mockField} data-test-subj={mockTestId} />
    );

    expect(component.getByTestId(mockTestId)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it('should render one EuiButtonEmpty', () => {
    const component = render(
      <FilterOutButtonEmpty data={mockIndicator} field={mockField} data-test-subj={mockTestId} />
    );

    expect(component.getByTestId(mockTestId)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it('should render one EuiContextMenuItem (for EuiContextMenu use)', () => {
    const component = render(<FilterOutContextMenu data={mockIndicator} field={mockField} />);

    expect(component).toMatchSnapshot();
  });

  it('should render one Component (for EuiDataGrid use)', () => {
    const mockComponent: FunctionComponent = () => <EuiButtonIcon iconType="plusInCircle" />;

    const component = render(
      <FilterOutCellAction data={mockIndicator} field={mockField} Component={mockComponent} />
    );

    expect(component).toMatchSnapshot();
  });
});
