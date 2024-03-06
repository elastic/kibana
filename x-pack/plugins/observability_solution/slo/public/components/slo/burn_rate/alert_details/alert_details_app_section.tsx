/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiLink } from '@elastic/eui';
import { Rule } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { AlertSummaryField, TopAlert } from '@kbn/observability-plugin/public';
import { useKibana } from '../../../../utils/kibana_react';
import { useFetchSloDetails } from '../../../../hooks/use_fetch_slo_details';
import { BurnRateRuleParams } from '../../../../typings/slo';
import { AlertsHistoryPanel } from './components/alerts_history/alerts_history_panel';
import { ErrorRatePanel } from './components/error_rate/error_rate_panel';

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
    services: {
      http: { basePath },
    },
  } = useKibana();

  const sloId = alert.fields['kibana.alert.rule.parameters']!.sloId as string;
  const instanceId = alert.fields['kibana.alert.instance.id']!;
  const { isLoading, data: slo } = useFetchSloDetails({ sloId, instanceId });
  const alertLink = alert.link;

  useEffect(() => {
    setAlertSummaryFields([
      {
        label: i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.summaryField.slo', {
          defaultMessage: 'Source SLO',
        }),
        value: (
          <EuiLink data-test-subj="sloLink" href={basePath.prepend(alertLink!)}>
            {slo?.name ?? '-'}
          </EuiLink>
        ),
      },
      {
        label: i18n.translate('xpack.slo.burnRateRule.alertDetailsAppSection.summaryField.rule', {
          defaultMessage: 'Rule',
        }),
        value: (
          <EuiLink data-test-subj="ruleLink" href={ruleLink}>
            {rule.name}
          </EuiLink>
        ),
      },
    ]);
  }, [alertLink, rule, ruleLink, setAlertSummaryFields, basePath, slo]);

  return (
    <EuiFlexGroup direction="column" data-test-subj="overviewSection">
      <ErrorRatePanel alert={alert} slo={slo} isLoading={isLoading} />
      <AlertsHistoryPanel alert={alert} rule={rule} slo={slo} isLoading={isLoading} />
    </EuiFlexGroup>
  );
}
