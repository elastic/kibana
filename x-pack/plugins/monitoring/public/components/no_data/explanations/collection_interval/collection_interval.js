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

export class ExplainCollectionInterval extends React.Component {
  constructor(props) {
    super(props);
    this.handleClick = this.handleClick.bind(this);
  }

  handleClick() {
    const { enabler } = this.props;
    enabler.enableCollectionInterval();
  }

  render() {
    const {
      context,
      property,
      data,
      isCollectionIntervalUpdated,
      isCollectionIntervalUpdating
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
            The collection interval setting needs to be a positive integer
            (10s is recommended) in order for the collection agents to be active.
          </p>
          <p>
            Would you like us to change it and enable monitoring?
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
              data-test-subj="enableCollectionInterval"
              isLoading={isCollectionIntervalUpdating}
            >
              Turn on monitoring
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
    const renderSuccess = () => (
      <Fragment>
        <EuiTitle size="l">
          <h2>Success! Wait a moment please.</h2>
        </EuiTitle>
        <EuiHorizontalRule size="half" />
        <EuiText>
          <p>
            As soon as monitoring data appears in your
            cluster the page will automatically refresh with your monitoring
            dashboard. This only takes only a few seconds.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiLoadingSpinner size="l" />
      </Fragment>
    );

    // prettier-ignore
    return (
      <Fragment>
        {isCollectionIntervalUpdated ? renderSuccess() : renderButton()}
      </Fragment>
    );
  }
}

ExplainCollectionInterval.propTypes = {
  enabler: PropTypes.object.isRequired,
  context: PropTypes.string.isRequired,
  property: PropTypes.string.isRequired,
  data: PropTypes.string.isRequired,
  isCollectionIntervalUpdated: PropTypes.bool,
  isCollectionIntervalUpdating: PropTypes.bool
};
