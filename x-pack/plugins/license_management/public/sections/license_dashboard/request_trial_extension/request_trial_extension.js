/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexItem, EuiCard, EuiLink, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const RequestTrialExtension = ({ shouldShowRequestTrialExtension }) => {
  if (!shouldShowRequestTrialExtension) {
    return null;
  }
  const description = (
    <span>
      <FormattedMessage
        id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.howToContinueUsingPluginsDescription"
        defaultMessage="If you’d like to continuing using security, machine learning, and our
        other awesome {platinumLicenseFeaturesLinkText}, request an extension now."
        values={{
          platinumLicenseFeaturesLinkText: (
            <EuiLink
              href="https://www.elastic.co/subscriptions/xpack"
              target="_blank"
            >
              <FormattedMessage
                id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.platinumLicenseFeaturesLinkText"
                defaultMessage="Platinum features"
              />
            </EuiLink>
          )
        }}
      />
    </span>
  );
  return (
    <EuiFlexItem>
      <EuiCard
        title={(<FormattedMessage
          id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.extendYourTrialTitle"
          defaultMessage="Extend your trial"
        />)}
        description={description}
        footer={
          <EuiButton
            data-test-subj="extendTrialButton"
            target="_blank"
            href="https://www.elastic.co/trialextension"
          >
            <FormattedMessage
              id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.extendTrialButtonLabel"
              defaultMessage="Extend trial"
            />
          </EuiButton>
        }
      />
    </EuiFlexItem>
  );
};
