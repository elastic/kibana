/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';

export const ServicesTooltipContent = React.memo(() => {
  const linkProps = useLinkProps({
    app: 'home',
    hash: '/tutorial/apm',
  });
  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
  };
  return (
    <EuiText size="xs" onClick={onClick}>
      <p>
        <FormattedMessage
          id="xpack.infra.assetDetails.services.tooltip.servicesLabel"
          defaultMessage="Showing {apmTutorialLink} services detected on this host."
          values={{
            apmTutorialLink: (
              <EuiLink data-test-subj="assetDetailsTooltipApmTutorialLink" href={linkProps.href}>
                <FormattedMessage
                  id="xpack.infra.assetDetails.table.services.tooltip.tutorialLink"
                  defaultMessage="APM-instrumented"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
});
