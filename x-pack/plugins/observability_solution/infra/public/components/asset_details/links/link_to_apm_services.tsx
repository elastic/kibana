import { stringify } from 'querystring';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { encode } from '@kbn/rison';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export interface LinkToApmServicesProps {
  assetId: string;
  apmField: string;
}

export const LinkToApmServices = ({ assetId, apmField }: LinkToApmServicesProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const queryString = new URLSearchParams(
    encode(
      stringify({
        kuery: `${apmField}:"${assetId}"`,
      })
    )
  );

  const linkToApmServices = http.basePath.prepend(`/app/apm/services?${queryString}`);

  return (
    <EuiButtonEmpty
      data-test-subj="infraAssetDetailsViewAPMShowAllServicesButton"
      size="xs"
      flush="both"
      href={linkToApmServices}
      iconSide="right"
      iconType="sortRight"
    >
      <FormattedMessage
        id="xpack.infra.hostsViewPage.flyout.viewApmServicesLinkLabel"
        defaultMessage="Show all"
      />
    </EuiButtonEmpty>
  );
};
