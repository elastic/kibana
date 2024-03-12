/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { LinkToAlertsHomePage } from '../links/link_to_alerts_page';
import { ALERTS_DOC_HREF } from '../../shared/alerts/constants';

export const AlertsTooltipContent = React.memo(() => {
  const onClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation();
  };

  return (
    <EuiText size="xs" onClick={onClick}>
      <p>
        <FormattedMessage
          id="xpack.infra.assetDetails.alerts.tooltip.alertsLabel"
          defaultMessage="Showing alerts for this host. You can create and manage alerts in {alerts}"
          values={{
            alerts: <LinkToAlertsHomePage />,
          }}
        />
      </p>
      <p>
        <FormattedMessage
          id="xpack.infra.assetDetails.alerts.tooltip.documentationLabel"
          defaultMessage="See {documentation} for more information"
          values={{
            documentation: (
              <EuiLink
                data-test-subj="infraAssetDetailsTooltipDocumentationLink"
                href={ALERTS_DOC_HREF}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.infra.assetDetails.alerts.tooltip.documentationLink"
                  defaultMessage="documentation"
                />
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiText>
  );
});
