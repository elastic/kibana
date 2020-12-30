/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { EuiTitle, EuiText, EuiTextColor, EuiLink, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const CloudDeployment = () => {
  return (
    <Fragment>
      <EuiTitle size="l">
        <h2>
          <FormattedMessage
            id="xpack.monitoring.noData.blurbs.cloudDeploymentTitle"
            defaultMessage="Your monitoring data is not available here."
          />
        </h2>
      </EuiTitle>
      <EuiTextColor color="subdued">
        <EuiSpacer />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.blurbs.cloudDeploymentDescription"
              defaultMessage="Please return to your "
            />
            <EuiLink href="https://cloud.elastic.co/deployments" target="_blank">
              cloud dashboard.
            </EuiLink>{' '}
            <FormattedMessage
              id="xpack.monitoring.noData.blurbs.cloudDeploymentDescriptionMore"
              defaultMessage="For more information on Monitoring in Elastic Cloud, please see "
            />
            <EuiLink
              href="https://www.elastic.co/guide/en/cloud/current/ec-enable-monitoring.html"
              target="_blank"
            >
              the documentation.
            </EuiLink>
          </p>
        </EuiText>
      </EuiTextColor>
    </Fragment>
  );
};
