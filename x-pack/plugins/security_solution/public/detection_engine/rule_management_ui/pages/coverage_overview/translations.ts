/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const COVERAGE_OVERVIEW_DASHBOARD_TITLE = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.pageTitle',
  {
    defaultMessage: 'MITRE ATT&CK\u00AE Coverage',
  }
);

export const COLLAPSE_CELLS_FILTER_BUTTON = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.collapseCellsButton',
  {
    defaultMessage: 'Collapse cells',
  }
);

export const EXPAND_CELLS_FILTER_BUTTON = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.expandCellsButton',
  {
    defaultMessage: 'Expand cells',
  }
);

export const DISABLED_RULES_METADATA_LABEL = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.disabledRulesMetadataLabel',
  {
    defaultMessage: 'Disabled Rules:',
  }
);

export const ENABLED_RULES_METADATA_LABEL = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.enabledRulesMetadataLabel',
  {
    defaultMessage: 'Enabled Rules:',
  }
);

export const SUBTECHNIQUES = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.subtechniques',
  {
    defaultMessage: 'Sub-techniques',
  }
);

export const INSTALL_ALL_AVAILABLE = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.installAllAvailableButtonLabel',
  {
    defaultMessage: 'Install all available',
  }
);

export const ENABLE_ALL_DISABLED = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.enableAllDisabledButtonLabel',
  {
    defaultMessage: 'Enable all disabled',
  }
);

export const COVERED_MITRE_TECHNIQUES = (enabledTechniques: number, totalTechniques: number) =>
  i18n.translate('xpack.securitySolution.coverageOverviewDashboard.coveredMitreTechniques', {
    values: { enabledTechniques, totalTechniques },
    defaultMessage: '{enabledTechniques}/{totalTechniques} techniques',
  });

export const COVERED_MITRE_SUBTECHNIQUES = (
  enabledSubtechniques: number,
  totalSubtechniques: number
) =>
  i18n.translate('xpack.securitySolution.coverageOverviewDashboard.coveredMitreSubtechniques', {
    values: { enabledSubtechniques, totalSubtechniques },
    defaultMessage: 'Sub-techniques {enabledSubtechniques}/{totalSubtechniques}',
  });

export const DISABLED_RULES_LIST_LABEL = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.disabledRulesListLabel',
  {
    defaultMessage: 'Disabled rules',
  }
);

export const ENABLED_RULES_LIST_LABEL = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.enabledRulesListLabel',
  {
    defaultMessage: 'Enabled rules',
  }
);

export const CoverageOverviewLegendTitle = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.legendTitle',
  {
    defaultMessage: 'Legend',
  }
);

export const CoverageOverviewLegendSubtitle = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.legendSubtitle',
  {
    defaultMessage: '(count will include all rules selected)',
  }
);

export const CoverageOverviewLegendRulesLabel = i18n.translate(
  'xpack.securitySolution.coverageOverviewDashboard.legendRulesLabel',
  {
    defaultMessage: 'rules',
  }
);
