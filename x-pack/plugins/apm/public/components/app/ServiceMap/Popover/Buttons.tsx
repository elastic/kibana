/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { MouseEvent } from 'react';
import { useApmPluginContext } from '../../../../hooks/useApmPluginContext';
import { useUrlParams } from '../../../../hooks/useUrlParams';
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
  // The params may contain the service name. We want to use the selected node's
  // service name in the button URLs, so make a copy and set the
  // `serviceName` property.
  const urlParams = { ...useUrlParams().urlParams } as APMQueryParams;
  urlParams.serviceName = selectedNodeServiceName;

  const detailsUrl = getAPMHref({
    basePath,
    path: `/services/${selectedNodeServiceName}/transactions`,
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
