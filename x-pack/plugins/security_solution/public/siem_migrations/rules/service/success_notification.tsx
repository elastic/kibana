/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { CoreStart } from '@kbn/core-lifecycle-browser';
import { i18n } from '@kbn/i18n';
import {
  SecurityPageName,
  useNavigation,
  NavigationProvider,
} from '@kbn/security-solution-navigation';
import type { ToastInput } from '@kbn/core-notifications-browser';
import { toMountPoint } from '@kbn/react-kibana-mount';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { RuleMigrationTaskStats } from '../../../../common/siem_migrations/model/rule_migration.gen';

type RuleMigrationStats = RuleMigrationTaskStats & { migration_id: string };

export const getSuccessToast = (migration: RuleMigrationStats, core: CoreStart): ToastInput => ({
  color: 'success',
  iconType: 'check',
  title: i18n.translate('xpack.securitySolution.siemMigrations.rulesService.polling.successTitle', {
    defaultMessage: 'Rule migration completed.',
  }),
  text: toMountPoint(
    <NavigationProvider core={core}>
      <SuccessToastContent migration={migration} />
    </NavigationProvider>,
    core
  ),
});

const SuccessToastContent: React.FC<{ migration: RuleMigrationStats }> = ({ migration }) => {
  const { migration_id: path, rules } = migration;
  const navigation = { deepLinkId: SecurityPageName.siemMigrationsRules, path };

  const { navigateTo, getAppUrl } = useNavigation();
  const onClick: React.MouseEventHandler = (ev) => {
    ev.preventDefault();
    navigateTo(navigation);
  };
  const url = getAppUrl(navigation);

  return (
    <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="s">
      <EuiFlexItem>
        <FormattedMessage
          id="xpack.securitySolution.siemMigrations.rulesService.polling.successText"
          defaultMessage="A migration of {totalRules} rules has finished."
          values={{ totalRules: rules.total }}
        />
      </EuiFlexItem>
      <EuiFlexItem>
        {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
        <EuiButtonEmpty size="xs" flush="left" onClick={onClick} href={url}>
          {i18n.translate(
            'xpack.securitySolution.siemMigrations.rulesService.polling.successLinkText',
            { defaultMessage: 'Check results' }
          )}
        </EuiButtonEmpty>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
