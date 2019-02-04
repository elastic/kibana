/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import styled from 'styled-components';

import { MainRouteParams } from '../../common/types';
import { RootState } from '../../reducers';
import { ShortcutsProvider } from '../shortcuts';
import { Content } from './content';
import { NotFound } from './not_found';
import { SideTabs } from './side_tabs';

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
  isNotFound: boolean;
}

class CodeMain extends React.Component<Props> {
  public render() {
    if (this.props.isNotFound) {
      return <NotFound />;
    }
    return (
      <Root>
        <Container>
          <React.Fragment>
            <SideTabs />
            <Content />
          </React.Fragment>
        </Container>
        <ShortcutsProvider />
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  isNotFound: state.file.isNotFound,
});

export const Main = connect(
  mapStateToProps
  // @ts-ignore
)(CodeMain);
