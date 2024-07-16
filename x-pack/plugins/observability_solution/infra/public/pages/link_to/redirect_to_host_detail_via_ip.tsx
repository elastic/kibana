/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';

import type { SerializableRecord } from '@kbn/utility-types';
import { ASSET_DETAILS_LOCATOR_ID } from '@kbn/observability-shared-plugin/public';
import { useHostIpToName } from './use_host_ip_to_name';
import { LoadingPage } from '../../components/loading_page';
import { Error } from '../error';
import { useMetricsDataViewContext } from '../../containers/metrics_source';
import { useKibanaContextForPlugin } from '../../hooks/use_kibana';
import { getSearchParams } from './redirect_to_node_detail';

type RedirectToHostDetailType = RouteComponentProps<{
  hostIp: string;
}>;

export const RedirectToHostDetailViaIP = ({
  match: {
    params: { hostIp },
  },
  location,
}: RedirectToHostDetailType) => {
  const { metricsView } = useMetricsDataViewContext();
  const {
    services: { share },
  } = useKibanaContextForPlugin();
  const baseLocator = share.url.locators.get(ASSET_DETAILS_LOCATOR_ID);

  const { error, name } = useHostIpToName(hostIp, (metricsView && metricsView.indices) || null);

  useEffect(() => {
    if (name) {
      const queryParams = new URLSearchParams(location.search);
      const search = getSearchParams('host', queryParams);

      baseLocator?.navigate({
        ...search,
        assetType: 'host',
        assetId: name,
        state: location.state as SerializableRecord,
      });
    }
  }, [baseLocator, location.search, location.state, name]);

  if (error) {
    return (
      <Error
        message={i18n.translate('xpack.infra.linkTo.hostWithIp.error', {
          defaultMessage: 'Host not found with IP address "{hostIp}".',
          values: { hostIp },
        })}
      />
    );
  }

  if (!name) {
    return (
      <LoadingPage
        message={i18n.translate('xpack.infra.linkTo.hostWithIp.loading', {
          defaultMessage: 'Loading host with IP address "{hostIp}".',
          values: { hostIp },
        })}
      />
    );
  }

  return null;
};
