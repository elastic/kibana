/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  ALL_VALUE,
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
} from '@kbn/slo-schema';
import React from 'react';
import { useKibana } from '../../../../utils/kibana_react';
import { convertSliApmParamsToApmAppDeeplinkUrl } from '../../../../utils/slo/convert_sli_apm_params_to_apm_app_deeplink_url';
import { OverviewItem } from './overview_item';

interface Props {
  indicator: APMTransactionDurationIndicator | APMTransactionErrorRateIndicator;
}

export function ApmIndicatorOverview({ indicator }: Props) {
  const {
    http: { basePath },
  } = useKibana().services;
  const { service, transactionType, transactionName, environment, filter } = indicator.params;

  const link = basePath.prepend(
    convertSliApmParamsToApmAppDeeplinkUrl({
      environment,
      filter,
      service,
      transactionName,
      transactionType,
    })
  );

  return (
    <OverviewItem
      title={i18n.translate('xpack.observability.slo.sloDetails.overview.apmSource', {
        defaultMessage: 'APM source',
      })}
      subtitle={
        <EuiFlexGroup direction="row" alignItems="flexStart" gutterSize="s" responsive={false} wrap>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow" href={link}>
              {i18n.translate(
                'xpack.observability.slo.sloDetails.overview.apmSource.serviceLabel',
                { defaultMessage: 'service: {value}', values: { value: service } }
              )}
            </EuiBadge>
          </EuiFlexItem>
          {environment !== ALL_VALUE && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" href={link}>
                {i18n.translate(
                  'xpack.observability.slo.sloDetails.overview.apmSource.environmentLabel',
                  { defaultMessage: 'environment: {value}', values: { value: environment } }
                )}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {transactionType !== ALL_VALUE && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" href={link}>
                {i18n.translate(
                  'xpack.observability.slo.sloDetails.overview.apmSource.transactionTypeLabel',
                  { defaultMessage: 'transactionType: {value}', values: { value: transactionType } }
                )}
              </EuiBadge>
            </EuiFlexItem>
          )}
          {transactionName !== ALL_VALUE && (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow" href={link}>
                {i18n.translate(
                  'xpack.observability.slo.sloDetails.overview.apmSource.transactionNameLabel',
                  { defaultMessage: 'transactionName: {value}', values: { value: transactionName } }
                )}
              </EuiBadge>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      }
    />
  );
}
