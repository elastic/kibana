/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
} from '@elastic/eui';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { AssistantAvatar } from '@kbn/elastic-assistant/impl/assistant/assistant_avatar/assistant_avatar';
import { SecuritySolutionLinkButton } from '../../../../../../../common/components/links';
import type { RuleMigrationStats } from '../../../../../../../siem_migrations/rules/types';
import * as i18n from '../translations';
import { TITLE_CLASS_NAME } from '../start_migration_card.styles';

export interface MigrationResultPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationResultPanel = React.memo<MigrationResultPanelProps>(({ migrationStats }) => {
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="none">
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <EuiText size="s" className={TITLE_CLASS_NAME}>
              <p>{i18n.START_MIGRATION_CARD_RESULT_TITLE(migrationStats.number)}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.START_MIGRATION_CARD_RESULT_DESCRIPTION({
                  createdAt: moment(migrationStats.created_at).format('MMMM Do YYYY, h:mm:ss a'),
                  finishedAt: moment(migrationStats.last_updated_at).fromNow(),
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiFlexGroup direction="column" alignItems="stretch" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type={AssistantAvatar} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s" className={TITLE_CLASS_NAME}>
                  <p>{i18n.VIEW_TRANSLATED_RULES_TITLE}</p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <EuiFlexGroup direction="column" alignItems="center">
                <EuiFlexItem grow={false}>
                  <p>{'TODO: chart'}</p>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <SecuritySolutionLinkButton
                    deepLinkId={SecurityPageName.siemMigrationsRules}
                    path={migrationStats.id}
                  >
                    {i18n.VIEW_TRANSLATED_RULES_BUTTON}
                  </SecuritySolutionLinkButton>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiPanel>
  );
});
MigrationResultPanel.displayName = 'MigrationResultPanel';
