/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { capitalize } from 'lodash';
import { EuiBasicTable, EuiBasicTableColumn, EuiHealth, EuiLink, EuiPanel } from '@elastic/eui';
import { Severity } from '@kbn/securitysolution-io-ts-alerting-types';
import { FormattedRelative } from '@kbn/i18n-react';
import { HeaderSection } from '../../../../common/components/header_section';

import { SEVERITY_COLOR } from '../util';
import { RuleAlertsItem, useRuleAlertsItems } from './rule_alerts_items';

const tableColumns: Array<EuiBasicTableColumn<RuleAlertsItem>> = [
  {
    field: 'name',
    name: 'Rule name', // TODO
    render: (name: string, { id }) => (
      <EuiLink
        data-test-subj="severityRuleAlertsTable-name"
        href={`/app/security/rules/id/${id}` /* TODO */}
      >
        {name}
      </EuiLink>
    ),
  },
  {
    field: 'last_alert_at',
    name: 'Last alert', // TODO
    render: (lastAlertAt: string) => (
      <FormattedRelative
        data-test-subj="severityRuleAlertsTable-lastAlertAt"
        value={new Date(lastAlertAt)}
      />
    ),
  },
  {
    field: 'alert_count',
    name: 'Alert count', // TODO
    render: (alertCount: number, { id }) => (
      <EuiLink
        data-test-subj="severityRuleAlertsTable-name"
        href={`/app/security/alerts?rule.id=${id}` /* TODO */}
      >
        {alertCount}
      </EuiLink>
    ),
  },
  {
    field: 'severity',
    name: 'Severity', // TODO
    render: (severity: Severity) => (
      <EuiHealth color={SEVERITY_COLOR[severity]}>{capitalize(severity)}</EuiHealth>
    ),
  },
];

interface RuleAlertsTableProps {
  signalIndexName: string | null;
}

export const RuleAlertsTable = React.memo<RuleAlertsTableProps>(({ signalIndexName }) => {
  const { items, isLoading, queryId } = useRuleAlertsItems({ signalIndexName });

  return (
    <EuiPanel hasBorder data-test-subj="ruleAlertsTablePanel">
      <HeaderSection
        id={queryId}
        title={'Open alerts by Rule' /* TODO */}
        titleSize="s"
        hideSubtitle
      />
      <EuiBasicTable
        data-test-subj="ruleAlertsTable"
        columns={tableColumns}
        items={items}
        loading={isLoading}
        noItemsMessage={<>{'No alerts found'}</> /** TODO */}
      />
    </EuiPanel>
  );
});
RuleAlertsTable.displayName = 'RuleAlertsTable';
