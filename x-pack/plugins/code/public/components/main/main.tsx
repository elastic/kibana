/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import styled from 'styled-components';

import { RepositoryUtils } from '../../../common/repository_utils';
import { CloneProgress, WorkerReservedProgress } from '../../../model';
import { MainRouteParams } from '../../common/types';
import { RootState } from '../../reducers';
import { cloneProgressSelector, progressSelector } from '../../selectors';
import { ShortcutsProvider } from '../shortcuts';
import { CloneStatus } from './clone_status';
import { Content } from './content';
import { NotFound } from './not_found';
import { SideTabs } from './side_tabs';
import { TopBar } from './top_bar';

const Root = styled.div`
  position: absolute;
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  progress: number;
  cloneProgress: CloneProgress;
  isNotFound: boolean;
}

class CodeMain extends React.Component<Props> {
  public shouldRenderProgress() {
    const { progress, cloneProgress } = this.props;
    return (
      !!progress &&
      progress < WorkerReservedProgress.COMPLETED &&
      !RepositoryUtils.hasFullyCloned(cloneProgress)
    );
  }

  public renderProgress() {
    const { progress, cloneProgress } = this.props;
    return <CloneStatus progress={progress} cloneProgress={cloneProgress} />;
  }

  public renderContent() {
    if (this.shouldRenderProgress()) {
      return this.renderProgress();
    } else {
      return (
        <React.Fragment>
          <SideTabs />
          <Content />
        </React.Fragment>
      );
    }
  }

  public render() {
    if (this.props.isNotFound) {
      return <NotFound />;
    }
    return (
      <Root>
        <TopBar routeParams={this.props.match.params} />
        <Container>{this.renderContent()}</Container>
        <ShortcutsProvider />
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  progress: progressSelector(state),
  cloneProgress: cloneProgressSelector(state),
  isNotFound: state.file.isNotFound,
});

// @ts-ignore
export const Main = connect(mapStateToProps)(CodeMain);
