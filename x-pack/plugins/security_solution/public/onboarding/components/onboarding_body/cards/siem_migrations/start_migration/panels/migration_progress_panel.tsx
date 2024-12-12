/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiPanel,
  EuiProgress,
  EuiLoadingSpinner,
  EuiIcon,
} from '@elastic/eui';
import { AssistantAvatar } from '@kbn/elastic-assistant';
import type { RuleMigrationStats } from '../../../../../../../siem_migrations/rules/types';
import * as i18n from '../translations';
import { TITLE_CLASS_NAME } from '../start_migration_card.styles';
import { CardSubduedText } from '../../../common/card_subdued_text';

export interface MigrationProgressPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationProgressPanel = React.memo<MigrationProgressPanelProps>(
  ({ migrationStats }) => {
    const finished = migrationStats.rules.completed + migrationStats.rules.failed;
    const progressValue = (finished / migrationStats.rules.total) * 100;

    const preparing = migrationStats.rules.pending === migrationStats.rules.total;

    return (
      <EuiPanel hasShadow={false} hasBorder paddingSize="m">
        <EuiFlexGroup direction="column" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiText size="s" className={TITLE_CLASS_NAME}>
              <p>{i18n.START_MIGRATION_CARD_MIGRATION_TITLE(migrationStats.number)}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              {i18n.START_MIGRATION_CARD_PROGRESS_DESCRIPTION(migrationStats.rules.total)}
            </EuiText>
          </EuiFlexItem>
          {preparing ? (
            <EuiFlexGroup
              direction="row"
              justifyContent="flexStart"
              alignItems="center"
              gutterSize="s"
            >
              <EuiFlexItem grow={false}>
                <EuiIcon size="m" type={AssistantAvatar} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <CardSubduedText size="s">
                  {i18n.START_MIGRATION_CARD_PREPARING_DESCRIPTION}
                </CardSubduedText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="s" />
              </EuiFlexItem>
            </EuiFlexGroup>
          ) : (
            <EuiFlexItem grow={false}>
              <EuiProgress
                value={progressValue}
                // valueText={i18n.START_MIGRATION_CARD_PROCESSING(
                //   migrationStats.rules.total - finished
                // )}
                max={100}
                color="success"
              />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
MigrationProgressPanel.displayName = 'MigrationProgressPanel';
