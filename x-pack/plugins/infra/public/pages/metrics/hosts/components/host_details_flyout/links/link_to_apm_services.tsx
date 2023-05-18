/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { stringify } from 'querystring';
import { encode } from '@kbn/rison';
import { css } from '@emotion/react';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { EuiIcon, EuiLink, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';

export interface LinkToApmServicesProps {
  hostName: string;
  apmField: string;
}

export const LinkToApmServices = ({ hostName, apmField }: LinkToApmServicesProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;
  const { euiTheme } = useEuiTheme();

  const queryString = new URLSearchParams(
    encode(
      stringify({
        kuery: `${apmField}:"${hostName}"`,
      })
    )
  );

  const linkToApmServices = http.basePath.prepend(`/app/apm/services?${queryString}`);

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiLink href={linkToApmServices} data-test-subj="hostsView-flyout-apm-services-link">
        <EuiIcon
          type="popout"
          css={css`
            margin-right: ${euiTheme.size.xs};
          `}
        />
        <FormattedMessage
          id="xpack.infra.hostsViewPage.flyout.apmServicesLinkLabel"
          defaultMessage="APM Services"
        />
      </EuiLink>
    </RedirectAppLinks>
  );
};
