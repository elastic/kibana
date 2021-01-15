/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText, EuiTextColor, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const CloudDeployment = () => {
  return (
    <EuiTextColor color="subdued">
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.monitoring.noData.blurbs.cloudDeploymentDescription"
            defaultMessage="Configure monitoring through "
          />
          <EuiLink href="https://cloud.elastic.co/deployments" target="_blank">
            Elasticsearch Service Console
          </EuiLink>{' '}
          <FormattedMessage
            id="xpack.monitoring.noData.blurbs.cloudDeploymentDescription2"
            defaultMessage="Go to "
          />
          <EuiLink href="https://cloud.elastic.co/deployments" target="_blank">
            Logs and metrics
          </EuiLink>{' '}
          <FormattedMessage
            id="xpack.monitoring.noData.blurbs.cloudDeploymentDescription3"
            defaultMessage="section for a deployment to configure monitoring. For more information visit "
          />
          <EuiLink
            href="https://www.elastic.co/guide/en/cloud/current/ec-enable-monitoring.html"
            target="_blank"
          >
            the documentation page.
          </EuiLink>
        </p>
      </EuiText>
    </EuiTextColor>
  );
};
