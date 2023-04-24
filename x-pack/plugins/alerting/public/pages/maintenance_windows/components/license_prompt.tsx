/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import * as i18n from '../translations';

const title = <h2 data-test-subj="license-prompt-title">{i18n.UPGRADE_TO_PLATINUM}</h2>;
const body = (
  <FormattedMessage
    data-test-subj="license-prompt-body"
    defaultMessage="Maintenance windows is available when you have the {appropriateLicense}, are using a {cloud}, or are testing out a Free Trial."
    id="xpack.alerting.maintenanceWindows.callout.message"
    values={{
      appropriateLicense: (
        <EuiLink
          data-test-subj="license-prompt-appropriate"
          href="https://www.elastic.co/subscriptions"
          target="_blank"
        >
          {i18n.LINK_APPROPRIATE_LICENSE}
        </EuiLink>
      ),
      cloud: (
        <EuiLink
          data-test-subj="license-prompt-cloud"
          href="https://www.elastic.co/cloud/elasticsearch-service/signup"
          target="_blank"
        >
          {i18n.LINK_CLOUD_DEPLOYMENT}
        </EuiLink>
      ),
    }}
  />
);

export const LicensePrompt = React.memo(() => {
  return <EuiPageTemplate.EmptyPrompt iconType="gear" title={title} body={body} />;
});
LicensePrompt.displayName = 'LicensePrompt';
