/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiSpacer, EuiText, EuiTextColor } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { RootState } from '../../reducers';

interface Project {
  name: string;
  timestamp: number;
}

interface Props {
  recentProjects: Project[];
}

class AdminSideBar extends React.PureComponent<Props> {
  public render() {
    const projects = this.props.recentProjects.map(p => (
      <div className="code-sidebar__link" key={p.name}>
        <EuiFlexGroup key={p.name} alignItems="center">
          <EuiFlexItem>
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiText>
                  <h4>{p.name}</h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText size="s">
                  <h6>
                    <EuiTextColor color="subdued">
                      Opened {moment(p.timestamp).fromNow()}
                    </EuiTextColor>
                  </h6>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiIcon type="arrowRight" color="subdued" />
        </EuiFlexGroup>
      </div>
    ));

    return (
      <div className="code-sidebar">
        <div className="code-sidebar__heading">
          <EuiText>
            <h3>Your Recent Projects</h3>
          </EuiText>
        </div>
        <EuiSpacer />
        <div>{projects}</div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  recentProjects: state.recentProjects.recentProjects,
});

export const SideBar = connect(mapStateToProps)(AdminSideBar);
