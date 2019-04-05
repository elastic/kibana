/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import url from 'url';

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { parse as parseQuery } from 'querystring';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { Repository } from '../../../model';
import { RootState } from '../../reducers';
import { EmptyProject } from './empty_project';
import { LanguageSeverTab } from './language_server_tab';
import { ProjectTab } from './project_tab';

const Container = styled.div`
  margin: 0 ${theme.euiSizeXL};
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
  languageServers = 'LanguageServers',
}

interface Props extends RouteComponentProps {
  repositories: Repository[];
  repositoryLoading: boolean;
  isAdmin: boolean;
}

interface State {
  tab: AdminTabs;
}

class AdminPage extends React.PureComponent<Props, State> {
  public static getDerivedStateFromProps(props: Props) {
    const getTab = () => {
      const { search } = props.location;
      let qs = search;
      if (search.charAt(0) === '?') {
        qs = search.substr(1);
      }
      return parseQuery(qs).tab || AdminTabs.projects;
    };
    return {
      tab: getTab() as AdminTabs,
    };
  }
  public tabs = [
    {
      id: AdminTabs.projects,
      name: AdminTabs.projects,
      disabled: false,
    },
    {
      id: AdminTabs.languageServers,
      name: 'Language servers',
      disabled: false,
    },
  ];
  constructor(props: Props) {
    super(props);
    const getTab = () => {
      const { search } = props.location;
      let qs = search;
      if (search.charAt(0) === '?') {
        qs = search.substr(1);
      }
      return parseQuery(qs).tab || AdminTabs.projects;
    };
    this.state = {
      tab: getTab() as AdminTabs,
    };
  }

  public getAdminTabClickHandler = (tab: AdminTabs) => () => {
    this.setState({ tab });
    this.props.history.push(url.format({ pathname: '/admin', query: { tab } }));
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
      case AdminTabs.languageServers: {
        return <LanguageSeverTab />;
      }
      case AdminTabs.projects:
      default: {
        const repositoriesCount = this.props.repositories.length;
        const showEmpty = repositoriesCount === 0 && !this.props.repositoryLoading;
        if (showEmpty) {
          return <EmptyProject isAdmin={this.props.isAdmin} />;
        }
        return <ProjectTab />;
      }
    }
  };

  public render() {
    return (
      <Root>
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
  isAdmin: state.userProfile.isCodeAdmin,
});

export const Admin = withRouter(connect(mapStateToProps)(AdminPage));
