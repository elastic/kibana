/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parse as parseQuery } from 'querystring';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import url from 'url';
import { EuiTab, EuiTabs } from '@elastic/eui';
import { Repository, SearchOptions, SearchScope } from '../../../model';
import { changeSearchScope } from '../../actions';
import { RootState } from '../../reducers';
import { SearchBar } from '../search_bar';
import { EmptyProject } from './empty_project';
import { LanguageSeverTab } from './language_server_tab';
import { ProjectTab } from './project_tab';

enum AdminTabs {
  projects = 'Repos',
  roles = 'Roles',
  languageServers = 'LanguageServers',
}

interface Props extends RouteComponentProps {
  searchOptions: SearchOptions;
  query: string;
  onSearchScopeChanged: (s: SearchScope) => void;
  repositories: Repository[];
  repositoryLoading: boolean;
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

  public searchBar: any = null;

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
          return <EmptyProject />;
        }
        return <ProjectTab />;
      }
    }
  };

  public render() {
    return (
      <div className="codeContainer__root">
        <div className="codeContainer__rootInner">
          <div className="codeContainer__adminWrapper">
            <SearchBar
              searchOptions={this.props.searchOptions}
              query={this.props.query}
              onSearchScopeChanged={this.props.onSearchScopeChanged}
              enableSubmitWhenOptionsChanged={false}
              ref={element => (this.searchBar = element)}
            />
            <div className="codeContainer__adminMain">
              {this.renderTabs()}
              {this.renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state: RootState) => ({
  ...state.search,
  repositories: state.repository.repositories,
  repositoryLoading: state.repository.loading,
});

const mapDispatchToProps = {
  onSearchScopeChanged: changeSearchScope,
};

export const Admin = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(AdminPage)
);
