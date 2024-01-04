/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiTitle } from '@elastic/eui';
import { Rule } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { AlertSummaryField } from '@kbn/observability-plugin/public/pages/alert_details/components/alert_summary';
import { TopAlert } from '@kbn/observability-plugin/public/typings/alerts';
import { BurnRateRuleParams } from '@kbn/observability-plugin/public/typings/slo';
import { useKibana } from '../../../../utils/kibana_react';

import React, { useEffect } from 'react';

export type BurnRateRule = Rule<BurnRateRuleParams>;
export type BurnRateAlert = TopAlert;

interface AppSectionProps {
  alert: BurnRateAlert;
  rule: BurnRateRule;
  ruleLink: string;
  setAlertSummaryFields: React.Dispatch<React.SetStateAction<AlertSummaryField[] | undefined>>;
}

// eslint-disable-next-line import/no-default-export
export default function AlertDetailsAppSection({
  alert,
  rule,
  ruleLink,
  setAlertSummaryFields,
}: AppSectionProps) {
  const {
    services: { http },
  } = useKibana();

  useEffect(() => {
    setAlertSummaryFields([
      {
        label: i18n.translate(
          'xpack.observability.slo.burnRateRule.alertDetailsAppSection.summaryField.slo',
          {
            defaultMessage: 'Source SLO',
          }
        ),
        value: (
          <EuiLink
            data-test-subj="alertDetailsAppSectionSLOLink"
            href={http.basePath.prepend(alert.link!)}
          >
            {rule.params.sloId}
          </EuiLink>
        ),
      },
      {
        label: i18n.translate(
          'xpack.observability.slo.burnRateRule.alertDetailsAppSection.summaryField.rule',
          {
            defaultMessage: 'Rule',
          }
        ),
        value: (
          <EuiLink data-test-subj="alertDetailsAppSectionRuleLink" href={ruleLink}>
            {rule.name}
          </EuiLink>
        ),
      },
    ]);
  }, [alert, rule, ruleLink, setAlertSummaryFields]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="alertOverviewSection">
      <EuiFlexItem>
        <EuiTitle size="xs">
          <h4>Hello World</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem>
        <pre>{JSON.stringify(alert, null, 2)}</pre>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
