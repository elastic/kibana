/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiEmptyPrompt, EuiPageSection, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useKibana } from '../common/hooks/use_kibana';

export const SubscriptionNotAllowed = () => {
  const { application } = useKibana().services;
  return (
    <EuiPageSection color="danger" alignment="center">
      <EuiEmptyPrompt
        iconType="alert"
        title={
          <h2>
            <FormattedMessage
              id="xpack.csp.subscriptionNotAllowed.promptTitle"
              defaultMessage="Upgrade for subscription features"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.csp.subscriptionNotAllowed.promptDescription"
              defaultMessage="To use these cloud security features, you must {link}."
              values={{
                link: (
                  <EuiLink
                    href={application.getUrlForApp('management', {
                      path: 'stack/license_management/home',
                    })}
                  >
                    <FormattedMessage
                      id="xpack.csp.subscriptionNotAllowed.promptLinkText"
                      defaultMessage="start a trial or upgrade your subscription"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        }
      />
    </EuiPageSection>
  );
};
