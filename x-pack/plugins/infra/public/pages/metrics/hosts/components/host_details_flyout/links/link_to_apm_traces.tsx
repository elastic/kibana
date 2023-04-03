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
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiIcon } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';

interface LinkToApmTracesProps {
  hostName: string;
  apmField: string;
}

export const LinkToApmTraces = ({ hostName, apmField }: LinkToApmTracesProps) => {
  const { services } = useKibanaContextForPlugin();
  const { http } = services;

  const queryString = new URLSearchParams(
    encode(
      stringify({
        kuery: `${apmField}:"${hostName}"`,
      })
    )
  );

  const linkToApmTraces = http.basePath.prepend(`/app/apm/traces?${queryString}`);

  return (
    <RedirectAppLinks coreStart={services}>
      <EuiLink href={linkToApmTraces} data-test-subj="infraHostsViewFlyoutApmTracesLink">
        <EuiIcon type="popout" />{' '}
        <FormattedMessage
          id="xpack.infra.hostsViewPage.flyout.apmTracesLinkLabel"
          defaultMessage="APM Traces"
        />
      </EuiLink>
    </RedirectAppLinks>
  );
};
