/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { identity, pickBy } from 'lodash';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { pickKeys } from '../../../../../../common/utils/pick_keys';
import { useApmPluginContext } from '../../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../../context/url_params_context/use_url_params';
import { unit } from '../../../../../utils/style';
import { PopoverTooltip } from '../../../popover_tooltip';
import { getComparisonEnabled } from '../../../time_comparison/get_comparison_enabled';
import { TruncateWithTooltip } from '../../../truncate_with_tooltip';
import { APMQueryParams } from '../../url_helpers';
import { APMLinkExtendProps, getLegacyApmHref } from '../apm_link';

export const txGroupsDroppedBucketName = '_other';

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
  overflowCount?: number;
}

const persistedFilters: Array<keyof APMQueryParams> = [
  'transactionResult',
  'serviceVersion',
];

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
  overflowCount = 0,
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
    return (
      <TruncateWithTooltip
        text={transactionName}
        content={<EuiLink href={href} {...rest} />}
      />
    );
  }

  return (
    <EuiFlexGroup alignItems="center" gutterSize="xs">
      <EuiFlexItem grow={false} style={{ fontStyle: 'italic' }}>
        {i18n.translate('xpack.apm.transactionDetail.remainingServices', {
          defaultMessage: 'Remaining Transactions',
        })}
      </EuiFlexItem>
      <EuiFlexItem>
        <PopoverTooltip
          ariaLabel={i18n.translate('xpack.apm.transactionDetail.tooltip', {
            defaultMessage: 'Max transaction groups reached tooltip',
          })}
          iconType="alert"
        >
          <EuiText style={{ width: `${unit * 28}px` }} size="s">
            <FormattedMessage
              defaultMessage="Current APM server capacity for handling unique transaction groups has been reached. There are at least {overflowCount, plural, one {1 transaction} other {# transactions}} missing in this list. Please decrease the number of transaction groups in your service or increase the memory allocated to APM server."
              id="xpack.apm.transactionDetail.maxGroups.message"
              values={{
                overflowCount,
              }}
            />
          </EuiText>
        </PopoverTooltip>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}
