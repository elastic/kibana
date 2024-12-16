/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import moment from 'moment';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiBasicTable,
  EuiHealth,
} from '@elastic/eui';
import { Chart, BarSeries, Settings, ScaleType } from '@elastic/charts';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { AssistantIcon } from '@kbn/ai-assistant-icon';
import { PanelText } from '../../../../common/components/panel_text';
import {
  convertTranslationResultIntoText,
  statusToColorMap,
} from '../../utils/translation_results';
import type { RuleMigrationTranslationStats } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useGetMigrationTranslationStats } from '../../logic/use_get_migration_translation_stats';
import { CenteredLoadingSpinner } from '../../../../common/components/centered_loading_spinner';
import { SecuritySolutionLinkButton } from '../../../../common/components/links';
import type { RuleMigrationStats } from '../../types';
import { RuleTranslationResult } from '../../../../../common/siem_migrations/constants';
import * as i18n from './translations';

export interface MigrationResultPanelProps {
  migrationStats: RuleMigrationStats;
}
export const MigrationResultPanel = React.memo<MigrationResultPanelProps>(({ migrationStats }) => {
  const { data: translationStats, isLoading: isLoadingTranslationStats } =
    useGetMigrationTranslationStats(migrationStats.id);
  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="none">
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiFlexGroup direction="column" alignItems="flexStart" gutterSize="xs">
          <EuiFlexItem grow={false}>
            <PanelText size="s" semiBold>
              <p>{i18n.RULE_MIGRATION_COMPLETE_TITLE(migrationStats.number)}</p>
            </PanelText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <PanelText size="s" subdued>
              <p>
                {i18n.RULE_MIGRATION_COMPLETE_DESCRIPTION(
                  moment(migrationStats.created_at).format('MMMM Do YYYY, h:mm:ss a'),
                  moment(migrationStats.last_updated_at).fromNow()
                )}
              </p>
            </PanelText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
      <EuiHorizontalRule margin="none" />
      <EuiPanel hasShadow={false} hasBorder={false} paddingSize="m">
        <EuiFlexGroup direction="column" alignItems="stretch" gutterSize="m">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiIcon type={AssistantIcon} size="m" />
              </EuiFlexItem>
              <EuiFlexItem>
                <PanelText size="s" semiBold>
                  <p>{i18n.RULE_MIGRATION_SUMMARY_TITLE}</p>
                </PanelText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiPanel hasShadow={false} hasBorder paddingSize="m">
              <EuiFlexGroup direction="column" alignItems="stretch">
                <EuiFlexItem>
                  {isLoadingTranslationStats ? (
                    <CenteredLoadingSpinner />
                  ) : (
                    translationStats && (
                      <>
                        <TranslationResultsChart translationStats={translationStats} />
                        <TranslationResultsTable translationStats={translationStats} />
                      </>
                    )
                  )}
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup direction="column" alignItems="center">
                    <EuiFlexItem>
                      <SecuritySolutionLinkButton
                        deepLinkId={SecurityPageName.siemMigrationsRules}
                        path={migrationStats.id}
                      >
                        {i18n.RULE_MIGRATION_VIEW_TRANSLATED_RULES_BUTTON}
                      </SecuritySolutionLinkButton>
                    </EuiFlexItem>
                  </EuiFlexGroup>
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

const TranslationResultsChart = React.memo<{
  translationStats: RuleMigrationTranslationStats;
}>(({ translationStats }) => {
  const data = [
    {
      category: 'Results',
      type: convertTranslationResultIntoText(RuleTranslationResult.FULL),
      value: translationStats.rules.success.result.full,
    },
    {
      category: 'Results',
      type: convertTranslationResultIntoText(RuleTranslationResult.PARTIAL),
      value: translationStats.rules.success.result.partial,
    },
    {
      category: 'Results',
      type: convertTranslationResultIntoText(RuleTranslationResult.UNTRANSLATABLE),
      value: translationStats.rules.success.result.untranslatable,
    },
    {
      category: 'Results',
      type: i18n.RULE_MIGRATION_TRANSLATION_FAILED,
      value: translationStats.rules.failed,
    },
  ];

  const colors = [
    statusToColorMap[RuleTranslationResult.FULL],
    statusToColorMap[RuleTranslationResult.PARTIAL],
    statusToColorMap[RuleTranslationResult.UNTRANSLATABLE],
    'danger',
  ];

  return (
    <Chart size={{ height: 100 }}>
      <Settings showLegend={false} rotation={90} />
      <BarSeries
        id="results"
        name="Results"
        data={data}
        xAccessor="category"
        yAccessors={['value']}
        splitSeriesAccessors={['type']}
        stackAccessors={['category']}
        xScaleType={ScaleType.Ordinal}
        yScaleType={ScaleType.Linear}
        color={colors}
      />
    </Chart>
  );
});
TranslationResultsChart.displayName = 'TranslationResultsChart';

const TranslationResultsTable = React.memo<{
  translationStats: RuleMigrationTranslationStats;
}>(({ translationStats }) => {
  const items = useMemo(() => {
    return [
      {
        id: 'full',
        title: convertTranslationResultIntoText(RuleTranslationResult.FULL),
        value: translationStats.rules.success.result.full,
        color: statusToColorMap[RuleTranslationResult.FULL],
      },
      {
        id: 'partial',
        title: convertTranslationResultIntoText(RuleTranslationResult.PARTIAL),
        value: translationStats.rules.success.result.partial,
        color: statusToColorMap[RuleTranslationResult.PARTIAL],
      },
      {
        id: 'untranslatable',
        title: convertTranslationResultIntoText(RuleTranslationResult.UNTRANSLATABLE),
        value: translationStats.rules.success.result.untranslatable,
        color: statusToColorMap[RuleTranslationResult.UNTRANSLATABLE],
      },
      {
        id: 'failed',
        title: i18n.RULE_MIGRATION_TRANSLATION_FAILED,
        value: translationStats.rules.failed,
        color: 'danger',
      },
    ];
  }, [translationStats]);

  return (
    <EuiBasicTable
      tableCaption="Demo of EuiBasicTable"
      items={items}
      rowHeader="firstName"
      compressed
      columns={[
        {
          field: 'title',
          name: i18n.RULE_MIGRATION_TABLE_COLUMN_RESULT,
          render: (value: string, { color }) => <EuiHealth color={color}>{value}</EuiHealth>,
        },
        {
          field: 'value',
          name: i18n.RULE_MIGRATION_TABLE_COLUMN_RULES,
          align: 'right',
        },
      ]}
    />
  );
});
TranslationResultsTable.displayName = 'TranslationResultsTable';
