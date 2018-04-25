/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import withErrorHandler from '../../shared/withErrorHandler';
import { HeaderContainer } from '../../shared/UIComponents';
import TabNavigation from '../../shared/TabNavigation';
import List from './List';
import { getKey } from '../../../store/apiHelpers';
import WatcherFlyout from './Watcher/WatcherFlyOut';
import OpenWatcherDialogButton from './Watcher/OpenWatcherDialogButton';

function maybeLoadList(props) {
  const { serviceName, start, end, q, sortBy, sortOrder } = props.urlParams;
  const keyArgs = {
    serviceName,
    start,
    end,
    q,
    sortBy,
    sortOrder
  };
  const key = getKey(keyArgs, false);

  if (serviceName && start && end && props.errorGroupList.key !== key) {
    props.loadErrorGroupList(keyArgs);
  }
}

class ErrorGroupOverview extends Component {
  state = {
    isFlyoutOpen: false
  };

  onOpenFlyout = () => {
    this.setState({ isFlyoutOpen: true });
  };

  onCloseFlyout = () => {
    this.setState({ isFlyoutOpen: false });
  };

  componentDidMount() {
    maybeLoadList(this.props);
  }

  componentWillReceiveProps(nextProps) {
    maybeLoadList(nextProps);
  }

  render() {
    const { license, location } = this.props;
    const { serviceName } = this.props.urlParams;

    return (
      <div>
        <HeaderContainer>
          <h1>{serviceName}</h1>
          {license.data.features.watcher.isAvailable && (
            <OpenWatcherDialogButton onOpenFlyout={this.onOpenFlyout} />
          )}
        </HeaderContainer>

        <TabNavigation />

        <List
          urlParams={this.props.urlParams}
          items={this.props.errorGroupList.data}
          location={location}
        />

        <WatcherFlyout
          serviceName={serviceName}
          isFlyoutOpen={this.state.isFlyoutOpen}
          onClose={this.onCloseFlyout}
        />
      </div>
    );
  }
}

ErrorGroupOverview.propTypes = {
  location: PropTypes.object.isRequired
};

export default withErrorHandler(ErrorGroupOverview, ['errorGroupList']);
