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
  EuiText,
  EuiPanel,
  EuiHorizontalRule,
  EuiIcon,
  EuiBasicTable,
  EuiBadge,
  EuiHealth,
} from '@elastic/eui';
import { Chart, BarSeries, Axis, Settings, Position, ScaleType } from '@elastic/charts';
import { SecurityPageName } from '@kbn/security-solution-navigation';
import { AssistantAvatar } from '@kbn/elastic-assistant/impl/assistant/assistant_avatar/assistant_avatar';
import {
  convertTranslationResultIntoColor,
  convertTranslationResultIntoText,
  statusToColorMap,
} from '../../../../../../../siem_migrations/rules/utils/translation_results';
import type { RuleMigrationTranslationStats } from '../../../../../../../../common/siem_migrations/model/rule_migration.gen';
import { useGetMigrationTranslationStats } from '../../../../../../../siem_migrations/rules/logic/use_get_migration_translation_stats';
import { CenteredLoadingSpinner } from '../../../../../../../common/components/centered_loading_spinner';
import { SecuritySolutionLinkButton } from '../../../../../../../common/components/links';
import type { RuleMigrationStats } from '../../../../../../../siem_migrations/rules/types';
import * as i18n from '../translations';
// import '@elastic/charts/dist/theme_light.css';
import { TITLE_CLASS_NAME } from '../start_migration_card.styles';
import { RuleTranslationResult } from '../../../../../../../../common/siem_migrations/constants';

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
            <EuiText size="s" className={TITLE_CLASS_NAME}>
              <p>{i18n.START_MIGRATION_CARD_RESULT_TITLE(migrationStats.number)}</p>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              <p>
                {i18n.START_MIGRATION_CARD_RESULT_DESCRIPTION(
                  moment(migrationStats.created_at).format('MMMM Do YYYY, h:mm:ss a'),
                  moment(migrationStats.last_updated_at).fromNow()
                )}
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
                        {i18n.VIEW_TRANSLATED_RULES_BUTTON}
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
    { category: 'Results', type: 'Full', value: translationStats.rules.success.result.full },
    { category: 'Results', type: 'Partial', value: translationStats.rules.success.result.partial },
    {
      category: 'Results',
      type: 'Untranslatable',
      value: translationStats.rules.success.result.untranslatable,
    },
    { category: 'Results', type: 'Failed', value: translationStats.rules.failed },
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
        title: 'Failed',
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
          name: 'Result',
          render: (value: string, { color }) => <EuiHealth color={color}>{value}</EuiHealth>,
        },
        {
          field: 'value',
          name: 'Rules',
          align: 'right',
        },
      ]}
    />
  );
});
TranslationResultsTable.displayName = 'TranslationResultsTable';
