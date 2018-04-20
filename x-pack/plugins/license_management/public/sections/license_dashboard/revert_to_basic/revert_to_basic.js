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
      licenseType
    } = this.props;
    if (!needsAcknowledgement) {
      return null;
    }
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Confirm Revert to Basic License"
          onCancel={this.cancel}
          onConfirm={() => startBasicLicense(licenseType, HTMLMarqueeElement)}
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
        You’ll revert to our free features and lose access to Security, Machine
        Learning and other{' '}
        <EuiLink
          href="https://www.elastic.co/subscriptions/xpack"
          target="_blank"
        >
          platinum features
        </EuiLink>.
      </span>
    );

    return (
      <EuiFlexItem>
        {this.acknowledgeModal()}
        <EuiCard
          title="Revert to basic license"
          description={description}
          footer={
            <EuiButton onClick={() => startBasicLicense(licenseType)}>
              Revert to basic
            </EuiButton>
          }
        />
      </EuiFlexItem>
    );
  }
}
