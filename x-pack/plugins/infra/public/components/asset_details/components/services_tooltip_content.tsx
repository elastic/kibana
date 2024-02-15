/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { RedirectAppLinks } from '@kbn/shared-ux-link-redirect-app';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const ServicesTooltipContent = () => {
  const { services } = useKibanaContextForPlugin();
  const linkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial/apm',
  });
  return (
    <EuiText size="xs">
      <FormattedMessage
        id="xpack.infra.assetDetails.services.tooltip.servicesLabel"
        defaultMessage="Showing {apmTutorialLink} services detected on this host."
        values={{
          apmTutorialLink: (
            <RedirectAppLinks coreStart={services} style={{ display: 'inline-block' }}>
              <EuiLink data-test-subj="assetDetailsTooltipApmTutorialLink" href={linkProps.href}>
                <FormattedMessage
                  id="xpack.infra.assetDetails.table.services.tooltip.tutorialLink"
                  defaultMessage="APM-instrumented"
                />
              </EuiLink>
            </RedirectAppLinks>
          ),
        }}
      />
    </EuiText>
  );
};
