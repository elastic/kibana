/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { hostsActions, hostsModel, hostsSelectors, State } from '../../../../store';

interface LastSeenHostReduxProps {
  overviewStatHost: hostsModel.OverviewStatHostModel;
  hostName: string | null;
  lastSeen: string | null;
}
interface LastSeenHostDispatchProps {
  updateOverviewStatHost: ActionCreator<hostsModel.OverviewStatHostModel>;
}

type LastSeenHostProps = LastSeenHostReduxProps & LastSeenHostDispatchProps;

class LastSeenHostComponent extends React.PureComponent<LastSeenHostProps> {
  public componentDidUpdate(prevProps: Readonly<LastSeenHostProps>): void {
    const { hostName, lastSeen, overviewStatHost, updateOverviewStatHost } = this.props;
    if (
      !!lastSeen &&
      !!hostName &&
      (hostName !== overviewStatHost.hostName ||
        lastSeen !== overviewStatHost.lastSeen ||
        lastSeen !== prevProps.lastSeen)
    ) {
      updateOverviewStatHost({ hostName, lastSeen });
    }
  }

  public render() {
    return <></>;
  }
}

const makeMapStateToProps = () => {
  const getOverviewStatHost = hostsSelectors.overviewStatHost();
  const mapStateToProps = (state: State) => ({
    overviewStatHost: getOverviewStatHost(state) || {},
  });
  return mapStateToProps;
};

export const LastSeenHost = connect(
  makeMapStateToProps,
  {
    updateOverviewStatHost: hostsActions.updateOverviewStatHost,
  }
)(LastSeenHostComponent);
