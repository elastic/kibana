/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { getMockCoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewTacticPanel } from './tactic_panel';
import type { CoverageOverviewMitreTactic } from '../../../rule_management/model/coverage_overview/mitre_tactic';

const renderTacticPanel = (
  tactic: CoverageOverviewMitreTactic = getMockCoverageOverviewMitreTactic()
) => {
  return render(
    <TestProviders>
      <CoverageOverviewTacticPanel tactic={tactic} />
    </TestProviders>
  );
};

describe('CoverageOverviewTacticPanel', () => {
  test('it renders information correctly', () => {
    const wrapper = renderTacticPanel();

    expect(wrapper.getByTestId('coverageOverviewTacticPanel')).toBeInTheDocument();
    expect(wrapper.getByTestId('metadataDisabledRulesCount')).toHaveTextContent('1');
    expect(wrapper.getByTestId('metadataEnabledRulesCount')).toHaveTextContent('1');
  });
});
