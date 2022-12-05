/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ReactNode } from 'react';
import { EuiLink } from '@elastic/eui';
import { useMlHref, ML_PAGES } from '@kbn/ml-plugin/public';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { DEFAULT_REFRESH_INTERVAL } from '../../date_picker/apm_date_picker';

interface Props {
  children?: ReactNode;
  jobId: string;
  external?: boolean;
  serviceName?: string;
  transactionType?: string;
}

export function MLSingleMetricLink({
  jobId,
  serviceName,
  transactionType,
  external,
  children,
}: Props) {
  const href = useSingleMetricHref({ jobId, serviceName, transactionType });

  return (
    <EuiLink
      children={children}
      href={href}
      external={external}
      target={external ? '_blank' : undefined}
    />
  );
}

function useSingleMetricHref({
  jobId,
  serviceName,
  transactionType,
}: {
  jobId: string;
  serviceName?: string;
  transactionType?: string;
}) {
  const {
    core,
    plugins: { ml },
  } = useApmPluginContext();
  const { urlParams } = useLegacyUrlParams();

  const {
    // hardcoding a custom default of 1 hour since the default kibana timerange of 15 minutes is shorter than the ML interval
    rangeFrom = 'now-1h',
    rangeTo = 'now',
  } = urlParams;

  const entities =
    serviceName && transactionType
      ? {
          entities: {
            'service.name': serviceName,
            'transaction.type': transactionType,
          },
        }
      : {};

  const href = useMlHref(ml, core.http.basePath.get(), {
    page: ML_PAGES.SINGLE_METRIC_VIEWER,
    pageState: {
      jobIds: [jobId],
      timeRange: { from: rangeFrom, to: rangeTo },
      refreshInterval: { pause: true, value: DEFAULT_REFRESH_INTERVAL },
      ...entities,
    },
  });

  return href;
}
