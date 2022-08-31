/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { VFC } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

interface PaywallProps {
  /**
   * Can be obtained using `http.basePath.prepend('/app/management/stack/license_management')`
   */
  licenseManagementHref: string;
}

export const Paywall: VFC<PaywallProps> = ({ licenseManagementHref }) => {
  return (
    <EuiEmptyPrompt
      icon={<EuiIcon type="logoSecurity" size="xl" />}
      color="subdued"
      data-test-subj="tiPaywall"
      title={
        <h2>
          <FormattedMessage
            id="xpack.threatIntelligence.paywall.title"
            defaultMessage="Do more with Security!"
          />
        </h2>
      }
      body={
        <p>
          <FormattedMessage
            id="xpack.threatIntelligence.paywall.body"
            defaultMessage="Start a free trial or upgrade your license to Enterprise to use threat intelligence."
          />
        </p>
      }
      actions={
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <div>
              <EuiButton color="primary" fill href="https://www.elastic.co/subscriptions">
                <FormattedMessage
                  id="xpack.threatIntelligence.paywall.upgrade"
                  defaultMessage="Upgrade"
                />
              </EuiButton>
            </div>
          </EuiFlexItem>
          <EuiFlexItem>
            <div>
              <EuiButtonEmpty href={licenseManagementHref}>
                <FormattedMessage
                  id="xpack.threatIntelligence.paywall.trial"
                  defaultMessage="Start a free trial"
                />
              </EuiButtonEmpty>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
      }
    />
  );
};
