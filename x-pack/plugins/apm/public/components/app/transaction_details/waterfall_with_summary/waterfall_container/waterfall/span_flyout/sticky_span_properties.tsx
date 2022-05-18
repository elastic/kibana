/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { METRIC_TYPE, useUiTracker } from '@kbn/observability-plugin/public';
import {
  SERVICE_NAME,
  SPAN_DESTINATION_SERVICE_RESOURCE,
  SPAN_NAME,
  TRANSACTION_NAME,
} from '../../../../../../../../common/elasticsearch_fieldnames';
import { getNextEnvironmentUrlParam } from '../../../../../../../../common/environment_filter_values';
import { NOT_AVAILABLE_LABEL } from '../../../../../../../../common/i18n';
import { Span } from '../../../../../../../../typings/es_schemas/ui/span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/transaction';
import { useApmParams } from '../../../../../../../hooks/use_apm_params';
import { BackendLink } from '../../../../../../shared/backend_link';
import { TransactionDetailLink } from '../../../../../../shared/links/apm/transaction_detail_link';
import { ServiceLink } from '../../../../../../shared/service_link';
import { StickyProperties } from '../../../../../../shared/sticky_properties';

interface Props {
  span: Span;
  transaction?: Transaction;
}

export function StickySpanProperties({ span, transaction }: Props) {
  const { query } = useApmParams('/services/{serviceName}/transactions/view');
  const { environment, latencyAggregationType, comparisonEnabled, offset } =
    query;

  const trackEvent = useUiTracker();

  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: transaction?.service.environment,
    currentEnvironmentUrlParam: environment,
  });

  const spanName = span.span.name;
  const dependencyName = span.span.destination?.service.resource;

  const transactionStickyProperties = transaction
    ? [
        {
          label: i18n.translate('xpack.apm.transactionDetails.serviceLabel', {
            defaultMessage: 'Service',
          }),
          fieldName: SERVICE_NAME,
          val: (
            <ServiceLink
              agentName={transaction.agent.name}
              query={{
                ...query,
                environment: nextEnvironment,
              }}
              serviceName={transaction.service.name}
            />
          ),
          width: '25%',
        },
        {
          label: i18n.translate(
            'xpack.apm.transactionDetails.transactionLabel',
            {
              defaultMessage: 'Transaction',
            }
          ),
          fieldName: TRANSACTION_NAME,
          val: (
            <TransactionDetailLink
              serviceName={transaction.service.name}
              transactionId={transaction.transaction.id}
              traceId={transaction.trace.id}
              transactionName={transaction.transaction.name}
              transactionType={transaction.transaction.type}
              environment={nextEnvironment}
              latencyAggregationType={latencyAggregationType}
              comparisonEnabled={comparisonEnabled}
              offset={offset}
            >
              {transaction.transaction.name}
            </TransactionDetailLink>
          ),
          width: '25%',
        },
      ]
    : [];

  const dependencyStickyProperties = dependencyName
    ? [
        {
          label: i18n.translate(
            'xpack.apm.transactionDetails.spanFlyout.dependencyLabel',
            {
              defaultMessage: 'Dependency',
            }
          ),
          fieldName: SPAN_DESTINATION_SERVICE_RESOURCE,
          val: (
            <BackendLink
              query={{
                ...query,
                backendName: dependencyName,
              }}
              subtype={span.span.subtype}
              type={span.span.type}
              onClick={() => {
                trackEvent({
                  app: 'apm',
                  metricType: METRIC_TYPE.CLICK,
                  metric: 'span_flyout_to_backend_detail',
                });
              }}
            />
          ),
          width: '25%',
        },
      ]
    : [];

  const stickyProperties = [
    {
      label: i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.nameLabel',
        {
          defaultMessage: 'Name',
        }
      ),
      fieldName: SPAN_NAME,
      val: spanName ?? NOT_AVAILABLE_LABEL,
      truncated: true,
      width: '25%',
    },
    ...dependencyStickyProperties,
    ...transactionStickyProperties,
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
