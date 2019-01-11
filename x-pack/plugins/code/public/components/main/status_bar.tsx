/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiPanel } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { indexRepo } from '../../actions';
import { ProjectSettings } from '../admin_page/project_settings';

const Root = styled(EuiFlexGroup)`
  position: relative;
`;
const Icon = styled(EuiIcon)`
  cursor: pointer;
`;

const PanelContainer = styled(EuiFlexItem)`
  position: absolute;
  right: 10px;
  top: -86px;
`;

const PopoverAction = styled.div`
  padding: 4px;
  cursor: pointer;
  span {
    margin-left: 8px;
    vertical-align: middle;
  }
`;

class CodeStatusBar extends React.Component<
  { repoUri: string; indexRepo: (repoUri: string) => void; indexStatus: any },
  { showPanel: boolean; showProjectSetting: boolean }
> {
  public state = {
    showPanel: false,
    showProjectSetting: false,
  };

  public showPanel = () => {
    this.setState({ showPanel: true });
  };

  public hidePanel = () => {
    this.setState({ showPanel: false });
  };

  public indexProject = () => {
    this.props.indexRepo(this.props.repoUri);
  };

  public showProjectSetting = () => {
    this.setState({ showProjectSetting: true });
  };

  public closeProjectSetting = () => {
    this.setState({ showProjectSetting: false });
  };

  public render() {
    const projectSetting = this.state.showProjectSetting && (
      <ProjectSettings repoUri={this.props.repoUri} onClose={this.closeProjectSetting} />
    );
    const panel = this.state.showPanel && (
      <PanelContainer>
        <EuiPanel onBlur={this.hidePanel} tabIndex={0}>
          <PopoverAction onClick={this.showProjectSetting} role="button">
            <Icon type="gear" />
            <span>Project Settings</span>
          </PopoverAction>
          <PopoverAction onClick={this.indexProject} role="button">
            <Icon type="indexOpen" />
            <span>Re-index Project</span>
          </PopoverAction>
          <PopoverAction>
            <Icon type="share" />
            <span>Share Project</span>
          </PopoverAction>
        </EuiPanel>
      </PanelContainer>
    );
    return (
      <Root gutterSize="none">
        <EuiFlexItem grow={false}>
          <Icon type="boxesVertical" color="primary" onClick={this.showPanel} />
        </EuiFlexItem>
        {panel}
        {projectSetting}
      </Root>
    );
  }
}

const mapDispatchToProps = { indexRepo };

export const StatusBar = connect(
  null,
  mapDispatchToProps
)(CodeStatusBar);
