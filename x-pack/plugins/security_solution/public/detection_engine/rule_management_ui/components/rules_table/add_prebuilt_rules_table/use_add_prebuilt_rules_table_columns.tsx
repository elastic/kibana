/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonEmpty, EuiBadge, EuiText, EuiLoadingSpinner, EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';
import { RulesTableEmptyColumnName } from '../rules_table_empty_column_name';
import { SHOW_RELATED_INTEGRATIONS_SETTING } from '../../../../../../common/constants';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { IntegrationsPopover } from '../../../../../detections/components/rules/related_integrations/integrations_popover';
import { SeverityBadge } from '../../../../../common/components/severity_badge';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { Rule } from '../../../../rule_management/logic';
import { useUserData } from '../../../../../detections/components/user_info';
import { hasUserCRUDPermission } from '../../../../../common/utils/privileges';
import type { AddPrebuiltRulesTableActions } from './add_prebuilt_rules_table_context';
import { useAddPrebuiltRulesTableContext } from './add_prebuilt_rules_table_context';
import type {
  RuleSignatureId,
  RuleResponse,
} from '../../../../../../common/api/detection_engine/model/rule_schema';
import { getNormalizedSeverity } from '../helpers';

export type TableColumn = EuiBasicTableColumn<RuleResponse>;

interface RuleNameProps {
  name: string;
  ruleId: string;
}

const RuleName = ({ name, ruleId }: RuleNameProps) => {
  const {
    actions: { openRulePreview },
  } = useAddPrebuiltRulesTableContext();

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

export const RULE_NAME_COLUMN: TableColumn = {
  field: 'name',
  name: i18n.COLUMN_RULE,
  render: (value: RuleResponse['name'], rule: RuleResponse) => (
    <RuleName name={value} ruleId={rule.id} />
  ),
  sortable: true,
  truncateText: true,
  width: '40%',
  align: 'left',
};

const TAGS_COLUMN: TableColumn = {
  field: 'tags',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_TAGS} />,
  align: 'center',
  render: (tags: RuleResponse['tags']) => {
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
  field: 'related_integrations',
  name: <RulesTableEmptyColumnName name={i18n.COLUMN_INTEGRATIONS} />,
  align: 'center',
  render: (integrations: RuleResponse['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '143px',
  truncateText: true,
};

const createInstallButtonColumn = (
  installOneRule: AddPrebuiltRulesTableActions['installOneRule'],
  loadingRules: RuleSignatureId[],
  isDisabled: boolean
): TableColumn => ({
  field: 'rule_id',
  name: <RulesTableEmptyColumnName name={i18n.INSTALL_RULE_BUTTON} />,
  render: (ruleId: RuleSignatureId, record: Rule) => {
    const isRuleInstalling = loadingRules.includes(ruleId);
    const isInstallButtonDisabled = isRuleInstalling || isDisabled;
    return (
      <EuiButtonEmpty
        size="s"
        disabled={isInstallButtonDisabled}
        onClick={() => installOneRule(ruleId)}
        data-test-subj={`installSinglePrebuiltRuleButton-${ruleId}`}
        aria-label={i18n.INSTALL_RULE_BUTTON_ARIA_LABEL(record.name)}
      >
        {isRuleInstalling ? (
          <EuiLoadingSpinner
            size="s"
            data-test-subj={`installSinglePrebuiltRuleButton-loadingSpinner-${ruleId}`}
          />
        ) : (
          i18n.INSTALL_RULE_BUTTON
        )}
      </EuiButtonEmpty>
    );
  },
  width: '10%',
  align: 'center',
});

export const useAddPrebuiltRulesTableColumns = (): TableColumn[] => {
  const [{ canUserCRUD }] = useUserData();
  const hasCRUDPermissions = hasUserCRUDPermission(canUserCRUD);
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);
  const {
    state: { loadingRules, isRefetching, isUpgradingSecurityPackages },
    actions: { installOneRule },
  } = useAddPrebuiltRulesTableContext();

  const isDisabled = isRefetching || isUpgradingSecurityPackages;

  return useMemo(
    () => [
      RULE_NAME_COLUMN,
      ...(showRelatedIntegrations ? [INTEGRATIONS_COLUMN] : []),
      TAGS_COLUMN,
      {
        field: 'risk_score',
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
        field: 'severity',
        name: i18n.COLUMN_SEVERITY,
        render: (value: Rule['severity']) => <SeverityBadge value={value} />,
        sortable: ({ severity }: RuleResponse) => getNormalizedSeverity(severity),
        truncateText: true,
        width: '12%',
      },
      ...(hasCRUDPermissions
        ? [createInstallButtonColumn(installOneRule, loadingRules, isDisabled)]
        : []),
    ],
    [hasCRUDPermissions, installOneRule, loadingRules, isDisabled, showRelatedIntegrations]
  );
};
