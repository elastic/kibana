/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import {
  EuiButton,
  EuiFlexItem,
  EuiCard,
  EuiLink,
  EuiOverlayMask,
  EuiConfirmModal,
  EuiText
} from '@elastic/eui';

import { ELASTIC_WEBSITE_URL, DOC_LINK_VERSION } from 'ui/documentation_links';

const esBase = `${ELASTIC_WEBSITE_URL}guide/en/elasticsearch/reference/${DOC_LINK_VERSION}`;
const securityDocumentationLink = `${esBase}/security-settings.html`;


export class StartTrial extends React.PureComponent {
  constructor(props) {
    super(props);
    this.state = { showConfirmation: false };
  }
  componentWillMount() {
    this.props.loadTrialStatus();
  }

  acknowledgeModal() {
    const { showConfirmation } = this.state;
    if (!showConfirmation) {
      return null;
    }
    const { startLicenseTrial } = this.props;
    return (
      <EuiOverlayMask>
        <EuiConfirmModal
          title="Start your free 30-day trial"
          onCancel={() => this.setState({ showConfirmation: false })}
          onConfirm={() => startLicenseTrial()}
          cancelButtonText="Cancel"
          confirmButtonText="Start my trial"
        >
          <div>
            <EuiText>
              <p>
                This trial is for the full set of{' '}
                <EuiLink
                  href="https://www.elastic.co/subscriptions/xpack"
                  target="_blank"
                >
                  Platinum features
                </EuiLink> of the Elastic Stack. You&apos;ll get immediate access to:
              </p>
              <ul>
                <li>Machine learning</li>
                <li>Alerting</li>
                <li>Graph capabilities</li>
                <li>JDBC connectivity for SQL</li>
              </ul>
              <p>
                Security features, such as authentication (native, AD/LDAP, SAML,
                PKI), role-based access control, and auditing, require
                configuration. See the{' '}
                <EuiLink
                  href={securityDocumentationLink}
                  target="_blank"
                >
                  documentation
                </EuiLink>{' '}
                for instructions.
              </p>
              <p>
                By starting this trial, you agree that it is subject to these{' '}
                <EuiLink
                  href="https://elastic.co/legal/trial_license"
                  target="_blank"
                >
                  terms and conditions
                </EuiLink>.
              </p>
            </EuiText>
          </div>
        </EuiConfirmModal>
      </EuiOverlayMask>
    );
  }

  render() {
    const { shouldShowStartTrial } = this.props;
    if (!shouldShowStartTrial) {
      return null;
    }
    const description = (
      <span>
        Experience what security, machine learning, and all our other{' '}
        <EuiLink
          href="https://www.elastic.co/subscriptions/xpack"
          target="_blank"
        >
          Platinum features
        </EuiLink>{' '}
        have to offer.
      </span>
    );

    const footer = (
      <EuiButton data-test-subj="startTrialButton" onClick={() => this.setState({ showConfirmation: true })}>
        Start trial
      </EuiButton>
    );
    return (
      <EuiFlexItem>
        {this.acknowledgeModal()}
        <EuiCard
          title="Start a 30-day trial"
          description={description}
          footer={footer}
        />
      </EuiFlexItem>
    );
  }
}
