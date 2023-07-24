/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { stringify } from 'querystring';
import { encode } from '@kbn/rison';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export interface LinkToApmServicesProps {
  nodeName: string;
  apmField: string;
}

export const LinkToApmServices = ({ nodeName, apmField }: LinkToApmServicesProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const queryString = new URLSearchParams(
    encode(
      stringify({
        kuery: `${apmField}:"${nodeName}"`,
      })
    )
  );

  const linkToApmServices = http.basePath.prepend(`/app/apm/services?${queryString}`);

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiButtonEmpty
        data-test-subj="hostsView-flyout-apm-services-link"
        size="xs"
        flush="both"
        href={linkToApmServices}
      >
        <FormattedMessage
          id="xpack.infra.hostsViewPage.flyout.viewApmServicesLinkLabel"
          defaultMessage="View APM Services"
        />
      </EuiButtonEmpty>
    </RedirectAppLinks>
  );
};
