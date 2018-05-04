/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { HeaderContainer } from '../../shared/UIComponents';
import TabNavigation from '../../shared/TabNavigation';
import List from './List';
import WatcherFlyout from './Watcher/WatcherFlyOut';
import OpenWatcherDialogButton from './Watcher/OpenWatcherDialogButton';
import { ErrorGroupDetailsRequest } from '../../../store/reactReduxRequest/errorGroupList';
import { KueryBar } from '../../shared/KueryBar';

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

  render() {
    const { license, location, urlParams } = this.props;
    const { serviceName } = urlParams;

    return (
      <div>
        <HeaderContainer>
          <h1>{serviceName}</h1>
          {license.data.features.watcher.isAvailable && (
            <OpenWatcherDialogButton onOpenFlyout={this.onOpenFlyout} />
          )}
        </HeaderContainer>

        <KueryBar />

        <TabNavigation />

        <ErrorGroupDetailsRequest
          urlParams={urlParams}
          render={({ data }) => (
            <List urlParams={urlParams} items={data} location={location} />
          )}
        />

        <WatcherFlyout
          serviceName={serviceName}
          isOpen={this.state.isFlyoutOpen}
          onClose={this.onCloseFlyout}
        />
      </div>
    );
  }
}

ErrorGroupOverview.propTypes = {
  location: PropTypes.object.isRequired
};

export default ErrorGroupOverview;
