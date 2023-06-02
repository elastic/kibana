/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiButtonEmpty, EuiBadge, EuiText, EuiLoadingSpinner } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { usePerformInstallSpecificRules } from '../../../../rule_management/logic/prebuilt_rules/use_perform_rule_install';
import { SHOW_RELATED_INTEGRATIONS_SETTING } from '../../../../../../common/constants';
import { PopoverItems } from '../../../../../common/components/popover_items';
import { useUiSetting$ } from '../../../../../common/lib/kibana';
import { IntegrationsPopover } from '../../../../../detections/components/rules/related_integrations/integrations_popover';
import { SeverityBadge } from '../../../../../detections/components/rules/severity_badge';
import * as i18n from '../../../../../detections/pages/detection_engine/rules/translations';
import type { Rule } from '../../../../rule_management/logic';
import type { RuleInstallationInfoForReview } from '../../../../../../common/detection_engine/prebuilt_rules/api/review_rule_installation/response_schema';

export type TableColumn = EuiBasicTableColumn<RuleInstallationInfoForReview>;

interface ColumnsProps {
  installSpecificRules: ReturnType<typeof usePerformInstallSpecificRules>['mutateAsync'];
  hasCRUDPermissions: boolean;
  isRuleInstalling: boolean;
}

const useRuleNameColumn = (): TableColumn => {
  return useMemo(
    () => ({
      field: 'name',
      name: i18n.COLUMN_RULE,
      render: (value: RuleInstallationInfoForReview['name']) => (
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
  field: 'tags',
  name: null,
  align: 'center',
  render: (tags: RuleInstallationInfoForReview['tags']) => {
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
  name: null,
  align: 'center',
  render: (integrations: RuleInstallationInfoForReview['related_integrations']) => {
    if (integrations == null || integrations.length === 0) {
      return null;
    }

    return <IntegrationsPopover relatedIntegrations={integrations} />;
  },
  width: '143px',
  truncateText: true,
};

type InstallRowRule = (
  value: RuleInstallationInfoForReview['rule_id'],
  item: RuleInstallationInfoForReview
) => void;

const createInstallButtonColumn = (
  installRowRule: InstallRowRule,
  isRuleInstalling: boolean
): TableColumn => ({
  field: 'rule_id',
  name: '',
  render: (
    value: RuleInstallationInfoForReview['rule_id'],
    item: RuleInstallationInfoForReview
  ) => {
    return (
      <EuiButtonEmpty
        size="s"
        disabled={isRuleInstalling}
        onClick={() => installRowRule(value, item)}
      >
        {isRuleInstalling ? <EuiLoadingSpinner size="s" /> : i18n.INSTALL_RULE_BUTTON}
      </EuiButtonEmpty>
    );
  },
  width: '10%',
  align: 'center',
});

export const useAddPrebuiltRulesTableColumns = ({
  installSpecificRules,
  hasCRUDPermissions,
  isRuleInstalling,
}: ColumnsProps): TableColumn[] => {
  const ruleNameColumn = useRuleNameColumn();
  const [showRelatedIntegrations] = useUiSetting$<boolean>(SHOW_RELATED_INTEGRATIONS_SETTING);

  const installRowRule = useMemo(
    () =>
      async (
        value: RuleInstallationInfoForReview['rule_id'],
        item: RuleInstallationInfoForReview
      ) => {
        await installSpecificRules([
          {
            rule_id: value,
            version: item.version,
          },
        ]);
      },
    [installSpecificRules]
  );

  return useMemo(
    () => [
      ruleNameColumn,
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
        sortable: true,
        truncateText: true,
        width: '12%',
      },
      ...(hasCRUDPermissions ? [createInstallButtonColumn(installRowRule, isRuleInstalling)] : []),
    ],
    [hasCRUDPermissions, installRowRule, isRuleInstalling, ruleNameColumn, showRelatedIntegrations]
  );
};
