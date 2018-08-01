/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiFlexItem,
  EuiCard,
  EuiButton,
  EuiLink,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiText
} from '@elastic/eui';

export class RevertToBasic extends React.PureComponent {
  cancel = () => {
    this.props.uploadLicenseStatus({});
  };

  acknowledgeModal() {
    const {
      needsAcknowledgement,
      messages: [firstLine, ...messages] = [],
      startBasicLicense,
      cancelStartBasicLicense,
      licenseType
    } = this.props;
    if (!needsAcknowledgement) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Confirm Revert to Basic License"
          onCancel={cancelStartBasicLicense}
          onConfirm={() => startBasicLicense(licenseType, true)}
          cancelButtonText="Cancel"
          confirmButtonText="Confirm"
        >
          <div>
            <EuiText>{firstLine}</EuiText>
            <EuiText>
              <ul>
                {messages.map(message => <li key={message}>{message}</li>)}
              </ul>
            </EuiText>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }
  render() {
    const {
      licenseType,
      shouldShowRevertToBasicLicense,
      startBasicLicense
    } = this.props;
    if (!shouldShowRevertToBasicLicense) {
      return null;
    }
    const description = (
      <span>
        You’ll revert to our free features and lose access to security, machine
        learning and other{' '}
        <EuiLink
          href="https://www.elastic.co/subscriptions/xpack"
          target="_blank"
        >
          Platinum features
        </EuiLink>.
      </span>
    );

    return (
      <EuiFlexItem>
        {this.acknowledgeModal()}
        <EuiCard
          title="Revert to Basic license"
          description={description}
          footer={
            <EuiButton data-test-subj="revertToBasicButton" onClick={() => startBasicLicense(licenseType)}>
              Revert to Basic
            </EuiButton>
          }
        />
      </EuiFlexItem>
    );
  }
}
