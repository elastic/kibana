/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import {
  EuiCode,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiSpacer,
  EuiHorizontalRule,
  EuiTitle,
} from '@elastic/eui';
import { WhatIs } from '../../blurbs';
import { FormattedMessage } from '@kbn/i18n-react';

export class ExplainCollectionEnabled extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
    this.waitedTooLongTimer = null;

    this.state = {
      waitedTooLong: false,
    };
  }

  componentWillUnmount() {
    clearInterval(this.waitedTooLongTimer);
  }

  handleClick() {
    const { enabler } = this.props;
    enabler.enableCollectionEnabled();

    // wait 22 seconds, show link to reload
    this.waitedTooLongTimer = setTimeout(() => {
      this.setState({ waitedTooLong: true });
    }, 22 * 1000);
  }

  render() {
    const { reason, isCollectionEnabledUpdated, isCollectionEnabledUpdating } = this.props;

    const { property, data, context } = reason;

    const renderButton = () => (
      <Fragment>
        <WhatIs />
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionEnabledDescription"
              defaultMessage="We checked the {context} settings and found that {property}
              is set to {data}."
              values={{
                context,
                property: <EuiCode>{property}</EuiCode>,
                data: <EuiCode>{data}</EuiCode>,
              }}
            />
          </p>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionEnabled.turnItOnDescription"
              defaultMessage="Would you like to turn it on?"
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup alignItems="center" justifyContent="spaceAround" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={true}
              onClick={this.handleClick}
              type="button"
              data-test-subj="enableCollectionEnabled"
              isLoading={isCollectionEnabledUpdating}
            >
              <FormattedMessage
                id="xpack.monitoring.noData.explanations.collectionEnabled.turnOnMonitoringButtonLabel"
                defaultMessage="Turn on monitoring"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );

    const stillWaiting = this.state.waitedTooLong ? (
      <p>
        <a href="#/">
          <FormattedMessage
            id="xpack.monitoring.noData.explanations.collectionEnabled.stillWaitingLinkText"
            defaultMessage="Still waiting?"
          />
        </a>
      </p>
    ) : null;

    const renderSuccess = () => (
      <Fragment>
        <EuiTitle size="l" data-test-subj="monitoringCollectionEnabledMessage">
          <h2>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionEnabled.monitoringTurnedOnTitle"
              defaultMessage="Success! Getting your monitoring data."
            />
          </h2>
        </EuiTitle>
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            <FormattedMessage
              id="xpack.monitoring.noData.explanations.collectionEnabled.monitoringTurnedOnDescription"
              defaultMessage="When the data is in your cluster, your monitoring dashboard will
              show up here. This might take a few seconds."
            />
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiLoadingSpinner size="l" />
        <EuiSpacer />
        {stillWaiting}
      </Fragment>
    );

    // prettier-ignore
    return (
      <Fragment>
        {isCollectionEnabledUpdated ? renderSuccess() : renderButton()}
      </Fragment>
    );
  }
}

ExplainCollectionEnabled.propTypes = {
  enabler: PropTypes.object.isRequired,
  reason: PropTypes.object.isRequired,
  isCollectionEnabledUpdated: PropTypes.bool,
  isCollectionEnabledUpdating: PropTypes.bool,
};
