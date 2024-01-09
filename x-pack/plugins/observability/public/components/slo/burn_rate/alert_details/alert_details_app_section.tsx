/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiLoadingChart, htmlIdGenerator } from '@elastic/eui';
import { Rule } from '@kbn/alerting-plugin/common';
import { i18n } from '@kbn/i18n';
import { AlertSummaryField } from '@kbn/observability-plugin/public/pages/alert_details/components/alert_summary';
import { TopAlert } from '@kbn/observability-plugin/public/typings/alerts';
import { BurnRateRuleParams } from '@kbn/observability-plugin/public/typings/slo';
import React, { useEffect } from 'react';
import { useFetchSloDetails } from '../../../../hooks/slo/use_fetch_slo_details';
import { useKibana } from '../../../../utils/kibana_react';

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

  const sloId = alert.fields['kibana.alert.rule.parameters']!.sloId as string;
  const instanceId = alert.fields['kibana.alert.instance.id']!;
  const { isLoading, data: slo } = useFetchSloDetails({ sloId, instanceId });

  // @ts-ignore
  const burnRateOptions = (alert?.fields['kibana.alert.rule.parameters']?.windows ?? []).map(
    (ruleWindowDef: any) => ({
      id: htmlIdGenerator()(),
      label: i18n.translate('xpack.observability.slo.burnRates.fromRange.label', {
        defaultMessage: '{duration}h',
        values: { duration: ruleWindowDef.longWindow.value },
      }),
      windowName: ruleWindowDef.actionGroup,
      threshold: ruleWindowDef.burnRateThreshold,
      duration: ruleWindowDef.longWindow.value,
    })
  );

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
            {slo?.name ?? '-'}
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
  }, [alert, rule, ruleLink, setAlertSummaryFields, slo]);

  if (isLoading) {
    return <EuiLoadingChart size="m" mono data-test-subj="loading" />;
  }

  if (!slo) {
    return null;
  }

  return (
    <EuiFlexGroup direction="column" data-test-subj="alertOverviewSection">
      <EuiFlexItem>
        <pre>{JSON.stringify(alert, null, 2)}</pre>
      </EuiFlexItem>
      <EuiFlexItem>
        <pre>{JSON.stringify(rule, null, 2)}</pre>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
