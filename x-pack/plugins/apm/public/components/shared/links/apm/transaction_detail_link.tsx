/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { identity, pickBy } from 'lodash';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { getComparisonEnabled } from '../../time_comparison/get_comparison_enabled';
import { APMQueryParams } from '../url_helpers';
import { APMLinkExtendProps, getLegacyApmHref } from './apm_link';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  traceId?: string;
  transactionId?: string;
  transactionName: string;
  transactionType: string;
  latencyAggregationType?: string;
  environment?: string;
  comparisonEnabled?: boolean;
  offset?: string;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'transactionResult',
  'serviceVersion',
];

const txGroupsDroppedBucketName = '_other';

export function TransactionDetailLink({
  serviceName,
  traceId,
  transactionId,
  transactionName,
  transactionType,
  latencyAggregationType,
  environment,
  comparisonEnabled,
  offset = '1d',
  ...rest
}: Props) {
  const { urlParams } = useLegacyUrlParams();
  const { core } = useApmPluginContext();
  const defaultComparisonEnabled = getComparisonEnabled({
    core,
    urlComparisonEnabled: comparisonEnabled,
  });
  const location = useLocation();
  const href = getLegacyApmHref({
    basePath: core.http.basePath,
    path: `/services/${serviceName}/transactions/view`,
    query: {
      traceId,
      transactionId,
      transactionName,
      transactionType,
      comparisonEnabled: defaultComparisonEnabled,
      offset,
      ...pickKeys(urlParams as APMQueryParams, ...persistedFilters),
      ...pickBy({ latencyAggregationType, environment }, identity),
    },
    search: location.search,
  });

  if (transactionName !== txGroupsDroppedBucketName) {
    return <EuiLink href={href} {...rest} />;
  }

  return (
    <EuiToolTip
      content={i18n.translate('xpack.apm.transactionDetail.tooltip.message', {
        defaultMessage:
          "The transaction group limit has been reached. Please see the APM Server docs for 'aggregation.transaction.max_groups' to increase this",
      })}
    >
      <EuiFlexGroup alignItems="center" gutterSize="xs">
        <EuiFlexItem grow={1}>
          {i18n.translate('xpack.apm.transactionDetail.other.label', {
            defaultMessage: 'other',
          })}
        </EuiFlexItem>
        <EuiFlexItem grow={1}>
          <EuiIcon size="s" color="subdued" type="alert" />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiToolTip>
  );
}
