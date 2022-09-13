/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import { render } from '@testing-library/react';
import { EuiButtonIcon } from '@elastic/eui';
import { generateMockIndicator, Indicator } from '../../../../../common/types/indicator';
import { useIndicatorsFiltersContext } from '../../../indicators/hooks/use_indicators_filters_context';
import { mockIndicatorsFiltersContext } from '../../../../common/mocks/mock_indicators_filters_context';
import { FilterIn } from '.';
import { ComponentType } from '../../../../../common/types/component_type';

jest.mock('../../../indicators/hooks/use_indicators_filters_context');

const mockIndicator: Indicator = generateMockIndicator();

const mockField: string = 'threat.feed.name';

const mockTestId: string = 'abc';

describe('<FilterIn />', () => {
  beforeEach(() => {
    (
      useIndicatorsFiltersContext as jest.MockedFunction<typeof useIndicatorsFiltersContext>
    ).mockReturnValue(mockIndicatorsFiltersContext);
  });

  it('should render one EuiButtonIcon', () => {
    const component = render(
      <FilterIn data={mockIndicator} field={mockField} data-test-subj={mockTestId} />
    );

    expect(component.getByTestId(mockTestId)).toBeInTheDocument();
    expect(component).toMatchSnapshot();
  });

  it('should render one Component (for EuiDataGrid use)', () => {
    const mockType: ComponentType = ComponentType.EuiDataGrid;
    const mockComponent: FunctionComponent = () => <EuiButtonIcon iconType="plusInCircle" />;

    const component = render(
      <FilterIn data={mockIndicator} field={mockField} type={mockType} as={mockComponent} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render one EuiContextMenuItem (for EuiContextMenu use)', () => {
    const mockType: ComponentType = ComponentType.ContextMenu;
    const component = render(<FilterIn data={mockIndicator} field={mockField} type={mockType} />);

    expect(component).toMatchSnapshot();
  });

  it('should render an empty component (wrong data input)', () => {
    const component = render(<FilterIn data={''} field={mockField} />);

    expect(component).toMatchSnapshot();
  });

  it('should render an empty component (wrong field input)', () => {
    const component = render(<FilterIn data={mockIndicator} field={''} />);

    expect(component).toMatchSnapshot();
  });
});
