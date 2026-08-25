/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export function MonitoringSetupModeProvider({ getService }) {
  const testSubjects = getService('testSubjects');

  const SUBJ_SETUP_MODE_BTN = 'monitoringSetupModeBtn';
  const SUBJ_SETUP_MODE_BOTTOM_BAR = 'monitoringSetupModeBottomBar';
  const SUBJ_SETUP_MODE_METRICBEAT_MIGRATION_TOOLTIP =
    'monitoringSetupModeMetricbeatMigrationTooltip';
  const SUBJ_SETUP_MODE_ALERTS_BADGE = 'monitoringSetupModeAlertBadges';
  const SUBJ_EXIT_SETUP_MODE_BTN = 'exitSetupModeBtn';

  return new (class SetupMode {
    async doesSetupModeBtnAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_BTN);
    }

    async clickSetupModeBtn() {
      return await testSubjects.click(SUBJ_SETUP_MODE_BTN);
    }

    async doesBottomBarAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_BOTTOM_BAR);
    }

    async doesMetricbeatMigrationTooltipAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_METRICBEAT_MIGRATION_TOOLTIP);
    }

    async doesAlertsTooltipAppear() {
      return await testSubjects.exists(SUBJ_SETUP_MODE_ALERTS_BADGE);
    }

    async clickExitSetupModeBtn() {
      return await testSubjects.click(SUBJ_EXIT_SETUP_MODE_BTN);
    }
  })();
}
