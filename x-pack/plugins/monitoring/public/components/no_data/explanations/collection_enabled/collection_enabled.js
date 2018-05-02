/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  EuiTitle
} from '@elastic/eui';
import { WhatIs } from '../../blurbs';

export class ExplainCollectionEnabled extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { enabler } = this.props;
    enabler.enableCollectionEnabled();
  }

  render() {
    const {
      context,
      property,
      data,
      isCollectionEnabledUpdated,
      isCollectionEnabledUpdating
    } = this.props;

    const renderButton = () => (
      <Fragment>
        <WhatIs />
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            We checked the {context} settings and found that <EuiCode>{property}</EuiCode>
            is set to <EuiCode>{data}</EuiCode>.
          </p>
          <p>
            Would you like to turn it on?
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceAround"
          gutterSize="s"
        >
          <EuiFlexItem grow={false}>
            <EuiButton
              fill={true}
              onClick={this.handleClick}
              type="button"
              data-test-subj="enableCollectionEnabled"
              isLoading={isCollectionEnabledUpdating}
            >
              Turn on monitoring
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
    const renderSuccess = () => (
      <Fragment>
        <EuiTitle size="l" data-test-subj="monitoringCollectionEnabledMessage">
          <h2>Success! Getting your monitoring data.</h2>
        </EuiTitle>
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            When the data is in your
            cluster, your monitoring
            dashboard will show up here. This only takes a few seconds.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiLoadingSpinner size="l" />
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
  context: PropTypes.string.isRequired,
  property: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired,
  isCollectionEnabledUpdated: PropTypes.bool,
  isCollectionEnabledUpdating: PropTypes.bool
};
