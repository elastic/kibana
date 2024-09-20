/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiText } from '@elastic/eui';
import { alertOriginSchema } from '@kbn/investigation-shared';
import { ALERT_RULE_CATEGORY } from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import React from 'react';
import { useKibana } from '../../../../hooks/use_kibana';
import { useInvestigation } from '../../contexts/investigation_context';
import { useFetchAlert } from '../../hooks/use_fetch_alert';

export function AlertDetailsButton() {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();
  const { investigation } = useInvestigation();

  const alertOriginInvestigation = alertOriginSchema.safeParse(investigation?.origin);
  const alertId = alertOriginInvestigation.success
    ? alertOriginInvestigation.data.id
    : '2ad3ff76-43ef-4b3d-b97a-baa2bfd21853';
  const { data: alertDetails } = useFetchAlert({ id: alertId });

  if (!alertDetails) {
    return null;
  }
  return (
    <EuiButtonEmpty
      data-test-subj="investigationDetailsAlertLink"
      iconType="arrowLeft"
      size="xs"
      href={basePath.prepend(`/app/observability/alerts/${alertId}`)}
    >
      <EuiText size="s">{`[Alert] ${alertDetails?.[ALERT_RULE_CATEGORY]} breached`}</EuiText>
    </EuiButtonEmpty>
  );
}
