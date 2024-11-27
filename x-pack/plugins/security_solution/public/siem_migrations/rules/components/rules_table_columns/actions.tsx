/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink } from '@elastic/eui';
import { canInstallMigrationRule } from '../../../../../common/siem_migrations/utils';
import { getRuleDetailsUrl } from '../../../../common/components/link_to';
import { useKibana } from '../../../../common/lib/kibana';
import { APP_UI_ID, SecurityPageName } from '../../../../../common';
import type { RuleMigration } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import * as i18n from './translations';
import type { TableColumn } from './constants';

interface ActionNameProps {
  disableActions?: boolean;
  migrationRule: RuleMigration;
  openMigrationRulePreview: (migrationRule: RuleMigration) => void;
  installMigrationRule: (migrationRule: RuleMigration, enable?: boolean) => void;
}

const ActionName = ({
  disableActions,
  migrationRule,
  openMigrationRulePreview,
  installMigrationRule,
}: ActionNameProps) => {
  const { navigateToApp } = useKibana().services.application;
  if (migrationRule.elastic_rule?.id) {
    const ruleId = migrationRule.elastic_rule.id;
    return (
      <EuiLink
        disabled={disableActions}
        onClick={() => {
          navigateToApp(APP_UI_ID, {
            deepLinkId: SecurityPageName.rules,
            path: getRuleDetailsUrl(ruleId),
          });
        }}
        data-test-subj="viewRule"
      >
        {i18n.ACTIONS_VIEW_LABEL}
      </EuiLink>
    );
  }

  if (migrationRule.status === 'failed') {
    return (
      <EuiLink disabled={disableActions} onClick={() => {}} data-test-subj="restartRule">
        {i18n.ACTIONS_RESTART_LABEL}
      </EuiLink>
    );
  }

  if (canInstallMigrationRule(migrationRule)) {
    return (
      <EuiLink
        disabled={disableActions}
        onClick={() => {
          installMigrationRule(migrationRule);
        }}
        data-test-subj="installRule"
      >
        {i18n.ACTIONS_INSTALL_LABEL}
      </EuiLink>
    );
  }

  return (
    <EuiLink
      disabled={disableActions}
      onClick={() => {
        openMigrationRulePreview(migrationRule);
      }}
      data-test-subj="editRule"
    >
      {i18n.ACTIONS_EDIT_LABEL}
    </EuiLink>
  );
};

interface CreateActionsColumnProps {
  disableActions?: boolean;
  openMigrationRulePreview: (migrationRule: RuleMigration) => void;
  installMigrationRule: (migrationRule: RuleMigration, enable?: boolean) => void;
}

export const createActionsColumn = ({
  disableActions,
  openMigrationRulePreview,
  installMigrationRule,
}: CreateActionsColumnProps): TableColumn => {
  return {
    field: 'elastic_rule',
    name: i18n.COLUMN_ACTIONS,
    render: (value: RuleMigration['elastic_rule'], migrationRule: RuleMigration) => {
      return (
        <ActionName
          disableActions={disableActions}
          migrationRule={migrationRule}
          openMigrationRulePreview={openMigrationRulePreview}
          installMigrationRule={installMigrationRule}
        />
      );
    },
    width: '10%',
    align: 'center',
  };
};
