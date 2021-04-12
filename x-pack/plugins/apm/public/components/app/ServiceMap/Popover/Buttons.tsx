/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useUrlParams } from '../../../../context/url_params_context/use_url_params';
import { getAPMHref } from '../../../shared/Links/apm/APMLink';
import { APMQueryParams } from '../../../shared/Links/url_helpers';

interface ButtonsProps {
  onFocusClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
  selectedNodeServiceName: string;
}

export function Buttons({
  onFocusClick = () => {},
  selectedNodeServiceName,
}: ButtonsProps) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const urlParams = useUrlParams().urlParams as APMQueryParams;

  const detailsUrl = getAPMHref({
    basePath,
    path: `/services/${selectedNodeServiceName}`,
    query: urlParams,
  });
  const focusUrl = getAPMHref({
    basePath,
    path: `/services/${selectedNodeServiceName}/service-map`,
    query: urlParams,
  });

  return (
    <>
      <EuiFlexItem>
        <EuiButton href={detailsUrl} fill={true}>
          {i18n.translate('xpack.apm.serviceMap.serviceDetailsButtonText', {
            defaultMessage: 'Service Details',
          })}
        </EuiButton>
      </EuiFlexItem>
      <EuiFlexItem>
        <EuiButton color="secondary" href={focusUrl} onClick={onFocusClick}>
          {i18n.translate('xpack.apm.serviceMap.focusMapButtonText', {
            defaultMessage: 'Focus map',
          })}
        </EuiButton>
      </EuiFlexItem>
    </>
  );
}
