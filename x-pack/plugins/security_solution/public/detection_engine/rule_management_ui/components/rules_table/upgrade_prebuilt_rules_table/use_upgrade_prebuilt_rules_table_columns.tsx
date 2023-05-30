/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn, EuiTableActionsColumnType } from '@elastic/eui';
import { EuiButtonEmpty, EuiBadge, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { usePerformUpgradeSpecificRules } from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_upgrade';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_upgrade/response_schema';
import {
  DEFAULT_RELATIVE_DATE_THRESHOLD,
  SHOW_RELATED_INTEGRATIONS_SETTING,
} from '../../../../../../common/constants';
import { getEmptyTagValue } from '../../../../../common/components/empty_value';
import { FormattedRelativePreferenceDate } from '../../../../../common/components/formatted_date';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { IntegrationsPopover } from '../../../../../detections/components/rules/related_integrations/integrations_popover';
import { SeverityBadge } from '../../../../../detections/components/rules/severity_badge';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { Rule } from '../../../../rule_management/logic';

export type TableColumn =
  | EuiBasicTableColumn<RuleUpgradeInfoForReview>
  | EuiTableActionsColumnType<RuleUpgradeInfoForReview>;

interface ColumnsProps {
  upgradeSpecificRules: ReturnType<typeof usePerformUpgradeSpecificRules>['mutateAsync'];
  hasCRUDPermissions: boolean;
}

const useRuleNameColumn = (): TableColumn => {
  return useMemo(
    () => ({
      field: 'rule.name',
      name: i18n.COLUMN_RULE,
      render: (value: RuleUpgradeInfoForReview['rule']['name']) => (
        <EuiText id={value} size="s">
          {value}
        </EuiText>
      ),
      sortable: true,
      truncateText: true,
      width: '40%',
    }),
    []
  );
};

const TAGS_COLUMN: TableColumn = {
  field: 'rule.tags',
  name: null,
  align: 'center',
  render: (tags: Rule['tags']) => {
    if (tags == null || tags.length === 0) {
      return null;
    }

    const renderItem = (tag: string, i: number) => (
      <EuiBadge color="hollow" key={`${tag}-${i}`} data-test-subj="tag">
        {tag}
      </EuiBadge>
    );
    return (
      <PopoverItems
        items={tags}
        popoverTitle={i18n.COLUMN_TAGS}
        popoverButtonTitle={tags.length.toString()}
        popoverButtonIcon="tag"
        dataTestPrefix="tags"
        renderItem={renderItem}
      />
    );
  },
  width: '65px',
  truncateText: true,
};

const INTEGRATIONS_COLUMN: TableColumn = {
  field: 'rule.related_integrations',
  name: null,
  align: 'center',
  render: (integrations: Rule['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '143px',
  truncateText: true,
};

type UpgradeRowRule = (
  value: RuleUpgradeInfoForReview['rule_id'],
  item: RuleUpgradeInfoForReview
) => void;

const createUpgradelButtonColumn = (upgradeRowRule: UpgradeRowRule): TableColumn => ({
  field: 'rule_id',
  name: '',
  render: (value: RuleUpgradeInfoForReview['rule_id'], item: RuleUpgradeInfoForReview) => {
    return (
      <EuiButtonEmpty size="s" onClick={() => upgradeRowRule(value, item)}>
        {i18n.UPGRADE_RULE_BUTTON}
      </EuiButtonEmpty>
    );
  },
  width: '10%',
});

export const useUpgradePrebuiltRulesTableColumns = ({
  upgradeSpecificRules,
  hasCRUDPermissions,
}: ColumnsProps): TableColumn[] => {
  const ruleNameColumn = useRuleNameColumn();
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  const upgradeRowRule = useMemo(
    () => async (value: RuleUpgradeInfoForReview['rule_id'], item: RuleUpgradeInfoForReview) => {
      await upgradeSpecificRules([
        {
          rule_id: value,
          version: item.rule.version,
          revision: item.rule.version,
        },
      ]);
    },
    [upgradeSpecificRules]
  );

  return useMemo(
    () => [
      ruleNameColumn,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'rule.risk_score',
        name: i18n.COLUMN_RISK_SCORE,
        render: (value: Rule['risk_score']) => (
          <EuiText data-test-subj="riskScore" size="s">
            {value}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '85px',
      },
      {
        field: 'rule.severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: true,
        truncateText: true,
        width: '12%',
      },
      {
        field: 'rule.updated_at',
        name: i18n.COLUMN_LAST_UPDATE,
        render: (value: Rule['updated_at']) => {
          return value == null ? (
            getEmptyTagValue()
          ) : (
            <FormattedRelativePreferenceDate
              tooltipFieldName={i18n.COLUMN_LAST_UPDATE}
              relativeThresholdInHrs={DEFAULT_RELATIVE_DATE_THRESHOLD}
              value={value}
              tooltipAnchorClassName="eui-textTruncate"
            />
          );
        },
        sortable: true,
        width: '18%',
        truncateText: true,
      },
      ...(hasCRUDPermissions ? [createUpgradelButtonColumn(upgradeRowRule)] : []),
    ],
    [hasCRUDPermissions, ruleNameColumn, showRelatedIntegrations, upgradeRowRule]
  );
};
