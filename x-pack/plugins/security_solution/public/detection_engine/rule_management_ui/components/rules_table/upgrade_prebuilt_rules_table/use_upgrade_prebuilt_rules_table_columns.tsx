/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiBadge, EuiButtonEmpty, EuiLink, EuiLoadingSpinner, EuiText } from '@elastic/eui';
import React, { useMemo } from 'react';
import { SHOW_RELATED_INTEGRATIONS_SETTING } from '../../../../../../common/constants';
import type { RuleUpgradeInfoForReview } from '../../../../../../common/api/detection_engine/prebuilt_rules';
import type { RuleSignatureId } from '../../../../../../common/api/detection_engine/model/rule_schema';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import { IntegrationsPopover } from '../../../../../detections/components/rules/related_integrations/integrations_popover';
import { SeverityBadge } from '../../../../../detections/components/rules/severity_badge';
import { useUserData } from '../../../../../detections/components/user_info';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { Rule } from '../../../../rule_management/logic';
import { getNormalizedSeverity } from '../helpers';
import type { UpgradePrebuiltRulesTableActions } from './upgrade_prebuilt_rules_table_context';
import { useUpgradePrebuiltRulesTableContext } from './upgrade_prebuilt_rules_table_context';

export type TableColumn = EuiBasicTableColumn<RuleUpgradeInfoForReview>;

interface RuleNameProps {
  name: string;
  ruleId: string;
}

const RuleName = ({ name, ruleId }: RuleNameProps) => {
  const {
    actions: { openRulePreview },
  } = useUpgradePrebuiltRulesTableContext();

  return (
    <EuiLink
      onClick={() => {
        openRulePreview(ruleId);
      }}
      data-test-subj="ruleName"
    >
      {name}
    </EuiLink>
  );
};

const RULE_NAME_COLUMN: TableColumn = {
  field: 'current_rule.name',
  name: i18n.COLUMN_RULE,
  render: (
    value: RuleUpgradeInfoForReview['current_rule']['name'],
    rule: RuleUpgradeInfoForReview
  ) => <RuleName name={value} ruleId={rule.id} />,
  sortable: true,
  truncateText: true,
  width: '60%',
  align: 'left',
};

const TAGS_COLUMN: TableColumn = {
  field: 'current_rule.tags',
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
  field: 'current_rule.related_integrations',
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

const createUpgradeButtonColumn = (
  upgradeOneRule: UpgradePrebuiltRulesTableActions['upgradeOneRule'],
  loadingRules: RuleSignatureId[],
  isDisabled: boolean
): TableColumn => ({
  field: 'rule_id',
  name: '',
  render: (ruleId: RuleUpgradeInfoForReview['rule_id']) => {
    const isRuleUpgrading = loadingRules.includes(ruleId);
    const isUpgradeButtonDisabled = isRuleUpgrading || isDisabled;
    return (
      <EuiButtonEmpty
        size="s"
        disabled={isUpgradeButtonDisabled}
        onClick={() => upgradeOneRule(ruleId)}
        data-test-subj={`upgradeSinglePrebuiltRuleButton-${ruleId}`}
      >
        {isRuleUpgrading ? (
          <EuiLoadingSpinner
            size="s"
            data-test-subj={`upgradeSinglePrebuiltRuleButton-loadingSpinner-${ruleId}`}
          />
        ) : (
          i18n.UPDATE_RULE_BUTTON
        )}
      </EuiButtonEmpty>
    );
  },
  width: '10%',
  align: 'center',
});

export const useUpgradePrebuiltRulesTableColumns = (): TableColumn[] => {
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);
  const {
    state: { loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { upgradeOneRule },
  } = useUpgradePrebuiltRulesTableContext();

  const isDisabled = isRefetching || isUpgradingSecurityPackages;

  return useMemo(
    () => [
      RULE_NAME_COLUMN,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'current_rule.risk_score',
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
        field: 'current_rule.severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: ({ current_rule: { severity } }: RuleUpgradeInfoForReview) =>
          getNormalizedSeverity(severity),
        truncateText: true,
        width: '12%',
      },
      ...(hasCRUDPermissions
        ? [createUpgradeButtonColumn(upgradeOneRule, loadingRules, isDisabled)]
        : []),
    ],
    [hasCRUDPermissions, loadingRules, isDisabled, showRelatedIntegrations, upgradeOneRule]
  );
};
