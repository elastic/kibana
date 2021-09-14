/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem, EuiCard, EuiLink, EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EXTERNAL_LINKS } from '../../../../../common/constants';

export const RequestTrialExtension = ({ shouldShowRequestTrialExtension }) => {
  if (!shouldShowRequestTrialExtension) {
    return null;
  }
  const description = (
    <span>
      <FormattedMessage
        id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.howToContinueUsingPluginsDescription"
        defaultMessage="If you’d like to continue using machine learning, advanced security, and our
        other awesome {subscriptionFeaturesLinkText}, request an extension now."
        values={{
          subscriptionFeaturesLinkText: (
            <EuiLink href={EXTERNAL_LINKS.SUBSCRIPTIONS} target="_blank">
              <FormattedMessage
                id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.subscriptionFeaturesLinkText"
                defaultMessage="subscription features"
              />
            </EuiLink>
          ),
        }}
      />
    </span>
  );
  return (
    <EuiFlexItem>
      <EuiCard
        hasBorder
        title={
          <FormattedMessage
            id="xpack.licenseMgmt.licenseDashboard.requestTrialExtension.extendYourTrialTitle"
            defaultMessage="Extend your trial"
          />
        }
        description={description}
        footer={
          <EuiButton
            data-test-subj="extendTrialButton"
            target="_blank"
            href={EXTERNAL_LINKS.TRIAL_EXTENSION}
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
