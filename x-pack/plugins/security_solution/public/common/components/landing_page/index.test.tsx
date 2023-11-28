/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { LandingPageComponent } from '.';

const mockUseContractComponents = jest.fn(() => ({}));
jest.mock('../../hooks/use_contract_component', () => ({
  useContractComponents: () => mockUseContractComponents(),
}));
jest.mock('../../../detection_engine/rule_management/logic/use_rule_management_filters', () => ({
  useRuleManagementFilters: jest.fn().mockReturnValue({ data: null }),
}));
jest.mock('../../../detection_engine/rule_management_ui/components/rules_table/helpers', () => ({
  isRulesTableEmpty: jest.fn().mockReturnValue(true),
}));
jest.mock(
  '../../../detection_engine/rule_management_ui/components/rules_table/rules_table/rules_table_context',
  () => ({
    useRulesTableContext: jest.fn().mockReturnValue({ state: { isLoading: false } }),
    RulesTableContextProvider: jest.fn(({ children }) => <>{children}</>),
  })
);
jest.mock('../../containers/sourcerer', () => ({
  useSourcererDataView: jest.fn().mockReturnValue({ indicesExist: false }),
}));
jest.mock('./land_page_context', () => ({
  updateLandingPageContext: jest.fn(),
}));

describe('LandingPageComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the get started component', () => {
    const GetStarted = () => <div data-test-subj="get-started-mock" />;
    mockUseContractComponents.mockReturnValue({ GetStarted });
    const { queryByTestId } = render(<LandingPageComponent />);

    expect(queryByTestId('get-started-mock')).toBeInTheDocument();
  });
});
