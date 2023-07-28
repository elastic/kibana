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

const renderTechniquePanelPopover = (
  technique: CoverageOverviewMitreTechnique = getMockCoverageOverviewMitreTechnique(),
  isExpanded: boolean = false
) => {
  return render(
    <TestProviders>
      <CoverageOverviewMitreTechniquePanelPopover technique={technique} isExpanded={isExpanded} />
    </TestProviders>
  );
};

describe('CoverageOverviewMitreTechniquePanelPopover', () => {
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
    expect(
      within(wrapper.getByTestId('coverageOverviewAvailableRulesList')).getByText(
        getMockCoverageOverviewMitreTechnique().availableRules[0].name
      )
    ).toBeInTheDocument();
  });
});
