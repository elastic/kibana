/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import moment from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { RootState } from '../../reducers';
import { colors } from '../../style/variables';

const Title = styled.div`
  color: #1a1a1a;
  font-size: 16px;
  font-family: SFProText-Semibold;
  font-weight: 600;
  margin-bottom: 25px;
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin-bottom: 20px;
`;

const Root = styled.div`
  padding: 24px 16px;
  flex-basis: 256px;
  flex-grow: 0;
  border-right: 1px solid ${colors.borderGrey};
`;

const RecentProject = styled.div`
  color: #1a1a1a;
  font-size: 1rem;
  font-family: SFProText-Bold;
  font-weight: bold;
  margin-bottom: 2px;
`;

const OpenTime = styled.div`
  color: #999999;
  font-size: 12px;
  font-family: SFProText-Regular;
  font-weight: normal;
`;

const IconContainer = styled.div`
  display: flex;
  align-items: center;
  svg {
    display: block;
  }
`;

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
      <Container key={p.name}>
        <div>
          <RecentProject>{p.name}</RecentProject>
          <OpenTime>Opened {moment(p.timestamp).fromNow()}</OpenTime>
        </div>
        <IconContainer>
          <EuiIcon type="arrowRight" />
        </IconContainer>
      </Container>
    ));
    return (
      <Root>
        <Title>Your Recent Projects</Title>
        <div>{projects}</div>
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  recentProjects: state.recentProjects.recentProjects,
});

export const SideBar = connect(mapStateToProps)(AdminSideBar);
