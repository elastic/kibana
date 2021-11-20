/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  SERVICE_NAME,
  TRANSACTION_NAME,
} from '../../../../../../../common/elasticsearch_fieldnames';
import { getNextEnvironmentUrlParam } from '../../../../../../../common/environment_filter_values';
import { Transaction } from '../../../../../../../typings/es_schemas/ui/transaction';
import { useLegacyUrlParams } from '../../../../../../context/url_params_context/use_url_params';
import { useApmParams } from '../../../../../../hooks/use_apm_params';
import { TransactionDetailLink } from '../../../../../shared/Links/apm/transaction_detail_link';
import { ServiceLink } from '../../../../../shared/service_link';
import { StickyProperties } from '../../../../../shared/sticky_properties';

interface Props {
  transaction?: Transaction;
}

export function FlyoutTopLevelProperties({ transaction }: Props) {
  const {
    urlParams: { latencyAggregationType },
  } = useLegacyUrlParams();
  const { query } = useApmParams('/services/{serviceName}/transactions/view');

  if (!transaction) {
    return null;
  }

  const nextEnvironment = getNextEnvironmentUrlParam({
    requestedEnvironment: transaction.service.environment,
    currentEnvironmentUrlParam: query.environment,
  });

  const stickyProperties = [
    {
      label: i18n.translate('xpack.apm.transactionDetails.serviceLabel', {
        defaultMessage: 'Service',
      }),
      fieldName: SERVICE_NAME,
      val: (
        <ServiceLink
          agentName={transaction.agent.name}
          query={{ ...query, environment: nextEnvironment }}
          serviceName={transaction.service.name}
        />
      ),
      width: '25%',
    },
    {
      label: i18n.translate('xpack.apm.transactionDetails.transactionLabel', {
        defaultMessage: 'Transaction',
      }),
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
        >
          {transaction.transaction.name}
        </TransactionDetailLink>
      ),
      width: '25%',
    },
  ];

  return <StickyProperties stickyProperties={stickyProperties} />;
}
