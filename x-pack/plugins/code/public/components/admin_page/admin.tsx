/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { connect } from 'react-redux';

import { EuiTab, EuiTabs } from '@elastic/eui';

import styled from 'styled-components';

import { Repository } from '../../../model';
import { RootState } from '../../reducers';
import { EmptyProject } from './empty_project';
import { LanguageSeverTab } from './language_server_tab';
import { ProjectTab } from './project_tab';
import { SideBar } from './side_bar';

const Container = styled.div`
  margin: 0 32px;
  flex-grow: 1;
`;

const Root = styled.div`
  display: flex;
  flex-direction: row;
  flex-grow: 1;
`;

enum AdminTabs {
  projects = 'Projects',
  roles = 'Roles',
  languageServers = 'Language Servers',
}

interface Props {
  repositories: Repository[];
  repositoryLoading: boolean;
  isAdmin: boolean;
}

interface State {
  tab: AdminTabs;
}

class AdminPage extends React.PureComponent<Props, State> {
  public state = {
    tab: AdminTabs.projects,
  };

  public tabs = [
    {
      id: AdminTabs.projects,
      name: AdminTabs.projects,
      disabled: false,
    },
    {
      id: AdminTabs.roles,
      name: AdminTabs.roles,
      disabled: false,
    },
    {
      id: AdminTabs.languageServers,
      name: AdminTabs.languageServers,
      disabled: false,
    },
  ];

  public getAdminTabClickHandler = (tab: AdminTabs) => () => {
    this.setState({ tab });
  };

  public renderTabs() {
    const tabs = this.tabs.map(tab => (
      <EuiTab
        onClick={this.getAdminTabClickHandler(tab.id)}
        isSelected={tab.id === this.state.tab}
        disabled={tab.disabled}
        key={tab.id}
      >
        {tab.name}
      </EuiTab>
    ));
    return <EuiTabs>{tabs}</EuiTabs>;
  }

  public filterRepos = () => {
    return this.props.repositories;
  };

  public renderTabContent = () => {
    switch (this.state.tab) {
      case AdminTabs.projects: {
        const repositoriesCount = this.props.repositories.length;
        const showEmpty = repositoriesCount === 0 && !this.props.repositoryLoading;
        if (showEmpty) {
          return <EmptyProject />;
        }
        return <ProjectTab />;
      }
      case AdminTabs.languageServers: {
        return <LanguageSeverTab />;
      }
    }
  };

  public render() {
    return (
      <Root>
        <SideBar />
        <Container>
          {this.renderTabs()}
          {this.renderTabContent()}
        </Container>
      </Root>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  repositories: state.repository.repositories,
  repositoryLoading: state.repository.loading,
  isAdmin: state.userConfig.isAdmin,
});

export const Admin = connect(mapStateToProps)(AdminPage);
