/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render } from '@testing-library/react';
import React from 'react';

import { getMockCoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/__mocks__';
import { TestProviders } from '../../../../common/mock';
import { CoverageOverviewMitreTechniquePanel } from './technique_panel';
import type { CoverageOverviewMitreTechnique } from '../../../rule_management/model/coverage_overview/mitre_technique';

const renderTechniquePanel = (
  technique: CoverageOverviewMitreTechnique = getMockCoverageOverviewMitreTechnique(),
  isExpanded: boolean = false
) => {
  return render(
    <TestProviders>
      <CoverageOverviewMitreTechniquePanel
        technique={technique}
        coveredSubtechniques={0}
        setIsPopoverOpen={() => {}}
        isPopoverOpen={false}
        isExpanded={isExpanded}
      />
    </TestProviders>
  );
};

describe('CoverageOverviewMitreTechniquePanel', () => {
  test('it renders collapsed view', () => {
    const wrapper = renderTechniquePanel();

    expect(wrapper.getByTestId('coverageOverviewTechniquePanel')).toBeInTheDocument();
    expect(wrapper.queryByTestId('coverageOverviewPanelMetadata')).not.toBeInTheDocument();
  });

  test('it renders expanded view', () => {
    const wrapper = renderTechniquePanel(getMockCoverageOverviewMitreTechnique(), true);

    expect(wrapper.getByTestId('coverageOverviewTechniquePanel')).toBeInTheDocument();
    expect(wrapper.getByTestId('coverageOverviewPanelMetadata')).toBeInTheDocument();
  });
});
