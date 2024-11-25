/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import { EuiText, EuiLink } from '@elastic/eui';
import React, { useMemo } from 'react';
import type { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SeverityBadge } from '../../../common/components/severity_badge';
import * as rulesI18n from '../../../detections/pages/detection_engine/rules/translations';
import * as i18n from './translations';
import { getNormalizedSeverity } from '../../../detection_engine/rule_management_ui/components/rules_table/helpers';
import { StatusBadge } from '../components/status_badge';
import { DEFAULT_TRANSLATION_RISK_SCORE, DEFAULT_TRANSLATION_SEVERITY } from '../utils/constants';

export type TableColumn = EuiBasicTableColumn<RuleMigration>;

interface RuleNameProps {
  name: string;
  rule: RuleMigration;
  openRulePreview: (rule: RuleMigration) => void;
}

const RuleName = ({ name, rule, openRulePreview }: RuleNameProps) => {
  return (
    <EuiLink
      onClick={() => {
        openRulePreview(rule);
      }}
      data-test-subj="ruleName"
    >
      {name}
    </EuiLink>
  );
};

const createRuleNameColumn = ({
  openRulePreview,
}: {
  openRulePreview: (rule: RuleMigration) => void;
}): TableColumn => {
  return {
    field: 'original_rule.title',
    name: rulesI18n.COLUMN_RULE,
    render: (value: RuleMigration['original_rule']['title'], rule: RuleMigration) => (
      <RuleName name={value} rule={rule} openRulePreview={openRulePreview} />
    ),
    sortable: true,
    truncateText: true,
    width: '40%',
    align: 'left',
  };
};

const STATUS_COLUMN: TableColumn = {
  field: 'translation_result',
  name: i18n.COLUMN_STATUS,
  render: (value: RuleMigration['translation_result'], rule: RuleMigration) => (
    <StatusBadge value={value} installedRuleId={rule.elastic_rule?.id} />
  ),
  sortable: false,
  truncateText: true,
  width: '12%',
};

export const useRulesTableColumns = ({
  openRulePreview,
}: {
  openRulePreview: (rule: RuleMigration) => void;
}): TableColumn[] => {
  return useMemo(
    () => [
      createRuleNameColumn({ openRulePreview }),
      STATUS_COLUMN,
      {
        field: 'risk_score',
        name: rulesI18n.COLUMN_RISK_SCORE,
        render: () => (
          <EuiText data-test-subj="riskScore" size="s">
            {DEFAULT_TRANSLATION_RISK_SCORE}
          </EuiText>
        ),
        sortable: true,
        truncateText: true,
        width: '75px',
      },
      {
        field: 'elastic_rule.severity',
        name: rulesI18n.COLUMN_SEVERITY,
        render: (value?: Severity) => (
          <SeverityBadge value={value ?? DEFAULT_TRANSLATION_SEVERITY} />
        ),
        sortable: ({ elastic_rule: elasticRule }: RuleMigration) =>
          getNormalizedSeverity(
            (elasticRule?.severity as Severity) ?? DEFAULT_TRANSLATION_SEVERITY
          ),
        truncateText: true,
        width: '12%',
      },
    ],
    [openRulePreview]
  );
};
