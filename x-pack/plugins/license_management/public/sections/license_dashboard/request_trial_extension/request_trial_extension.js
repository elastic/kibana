/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiFlexItem, EuiCard, EuiLink, EuiButton } from '@elastic/eui';

export const RequestTrialExtension = ({ shouldShowRequestTrialExtension }) => {
  if (!shouldShowRequestTrialExtension) {
    return null;
  }
  const description = (
    <span>
      If you’d like to continuing using Security, Machine Learning, and our
      other awesome{' '}
      <EuiLink
        href="https://www.elastic.co/subscriptions/xpack"
        target="_blank"
      >
        platinum features
      </EuiLink>, request an extension now.
    </span>
  );
  return (
    <EuiFlexItem>
      <EuiCard
        title="Extend your trial"
        description={description}
        footer={
          <EuiButton
            data-test-subj="extendTrialButton"
            style={{ marginTop: 'auto' }}
            target="_blank"
            href="https://www.elastic.co/trialextension"
          >
            Extend trial
          </EuiButton>
        }
      />
    </EuiFlexItem>
  );
};
