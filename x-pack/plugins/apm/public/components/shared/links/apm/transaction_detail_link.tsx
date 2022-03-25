/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { EuiLink } from '@elastic/eui';
import { pickBy, identity } from 'lodash';
import { getLegacyApmHref, APMLinkExtendProps } from './apm_link';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { pickKeys } from '../../../../../common/utils/pick_keys';
import { APMQueryParams } from '../url_helpers';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import {
  TimeRangeComparisonEnum,
  TimeRangeComparisonType,
} from '../../../../../common/runtime_types/comparison_type_rt';
import { getComparisonEnabled } from '../../time_comparison/get_comparison_enabled';

interface Props extends APMLinkExtendProps {
  serviceName: string;
  traceId?: string;
  transactionId?: string;
  transactionName: string;
  transactionType: string;
  latencyAggregationType?: string;
  environment?: string;
  comparisonEnabled?: boolean;
  comparisonType?: TimeRangeComparisonType;
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
  comparisonType = TimeRangeComparisonEnum.DayBefore,
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
      comparisonType,
      ...pickKeys(urlParams as APMQueryParams, ...persistedFilters),
      ...pickBy({ latencyAggregationType, environment }, identity),
    },
    search: location.search,
  });

  return <EuiLink href={href} {...rest} />;
}
