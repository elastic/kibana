/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, fireEvent, render, within } from '@testing-library/react';
import React from 'react';

import { getMockCoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/__mocks__';
import { TestProviders } from '../../../../common/mock';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';
import { CoverageOverviewMitreTechniquePanelPopover } from './technique_panel_popover';
import { useCoverageOverviewDashboardContext } from './coverage_overview_dashboard_context';
import { useUserData } from '../../../../detections/components/user_info';

jest.mock('./coverage_overview_dashboard_context');
jest.mock('../../../../detections/components/user_info');

const mockEnableAllDisabled = jest.fn();

const renderTechniquePanelPopover = (
  technique: CoverageOverviewMitreTechnique = getMockCoverageOverviewMitreTechnique()
) => {
  return render(
    <TestProviders>
      <CoverageOverviewMitreTechniquePanelPopover technique={technique} />
    </TestProviders>
  );
};

describe('CoverageOverviewMitreTechniquePanelPopover', () => {
  beforeEach(() => {
    (useCoverageOverviewDashboardContext as jest.Mock).mockReturnValue({
      state: { showExpandedCells: false, filter: {} },
      actions: { enableAllDisabled: mockEnableAllDisabled },
    });
    (useUserData as jest.Mock).mockReturnValue([{ loading: false, canUserCRUD: true }]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('it renders panel with collapsed view', () => {
    const wrapper = renderTechniquePanelPopover();

    expect(wrapper.getByTestId('coverageOverviewTechniquePanel')).toBeInTheDocument();
    expect(wrapper.queryByTestId('coverageOverviewPanelRuleStats')).not.toBeInTheDocument();
  });

  test('it renders panel with expanded view', () => {
    (useCoverageOverviewDashboardContext as jest.Mock).mockReturnValue({
      state: { showExpandedCells: true, filter: {} },
      actions: { enableAllDisabled: mockEnableAllDisabled },
    });
    const wrapper = renderTechniquePanelPopover();

    expect(wrapper.getByTestId('coverageOverviewTechniquePanel')).toBeInTheDocument();
    expect(wrapper.getByTestId('coverageOverviewPanelRuleStats')).toBeInTheDocument();
  });

  test('it renders all rules in correct areas', () => {
    const wrapper = renderTechniquePanelPopover();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewTechniquePanel'));
    });

    expect(wrapper.getByTestId('coverageOverviewPopover')).toBeInTheDocument();
    expect(
      within(wrapper.getByTestId('coverageOverviewEnabledRulesList')).getByText(
        getMockCoverageOverviewMitreTechnique().enabledRules[0].name
      )
    ).toBeInTheDocument();
    expect(
      within(wrapper.getByTestId('coverageOverviewDisabledRulesList')).getByText(
        getMockCoverageOverviewMitreTechnique().disabledRules[0].name
      )
    ).toBeInTheDocument();
  });

  test('calls bulk action enable when "Enable all disabled" button is pressed', async () => {
    const wrapper = renderTechniquePanelPopover();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewTechniquePanel'));
    });
    await act(async () => {
      fireEvent.click(wrapper.getByTestId('enableAllDisabledButton'));
    });

    expect(mockEnableAllDisabled).toHaveBeenCalledWith(['rule-id']);
  });

  test('"Enable all disabled" button is disabled when there are no disabled rules', async () => {
    const mockTechnique: CoverageOverviewMitreTechnique = {
      ...getMockCoverageOverviewMitreTechnique(),
      disabledRules: [],
    };
    const wrapper = renderTechniquePanelPopover(mockTechnique);

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewTechniquePanel'));
    });
    expect(wrapper.getByTestId('enableAllDisabledButton')).toBeDisabled();
  });

  test('"Enable all disabled" button is disabled when user does not have CRUD permissions', async () => {
    (useUserData as jest.Mock).mockReturnValue([{ loading: false, canUserCRUD: false }]);
    const wrapper = renderTechniquePanelPopover();

    act(() => {
      fireEvent.click(wrapper.getByTestId('coverageOverviewTechniquePanel'));
    });
    expect(wrapper.getByTestId('enableAllDisabledButton')).toBeDisabled();
  });
});
