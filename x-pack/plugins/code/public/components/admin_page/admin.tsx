/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { ChangeEvent, ReactNode } from 'react';

import { connect } from 'react-redux';

import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiModal,
  EuiOverlayMask,
  EuiPageContentBody,
  EuiProgress,
  // @ts-ignore
  EuiSearchBar,
  EuiSideNav,
  EuiTab,
  EuiTabs,
  EuiTitle,
} from '@elastic/eui';

import { Link } from 'react-router-dom';
import styled from 'styled-components';

import { RepoConfigs, Repository } from '../../../model';
import { deleteRepo, hideCallOut, importRepo, indexRepo, initRepoCommand } from '../../actions';
import { RootState } from '../../reducers';
import { CallOutType } from '../../reducers/repository';
import { FlexGrowContainer } from '../../styled_components/flex_grow_container';
import { RelativeContainer } from '../../styled_components/relative_container';
import { InlineProgressContainer } from './inline_progress_container';
import { LanguageSeverTab } from './language_server_tab';
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

const callOutTitle = {
  [CallOutType.danger]: 'Sorry, there was an error.',
  [CallOutType.success]: 'Successfully Imported!',
  [CallOutType.warning]: 'Successfully Imported!',
};

enum Tabs {
  GitAddress,
  GitHub,
}

enum AdminTabs {
  projects = 'Projects',
  roles = 'Roles',
  languageServers = 'Language Servers',
}

interface Props {
  repositories: Repository[];
  importLoading: boolean;
  deleteRepo: (uri: string) => void;
  indexRepo: (uri: string) => void;
  importRepo: (uri: string) => void;
  initRepoCommand: (uri: string) => void;
  repoConfigs?: RepoConfigs;
  showCallOut: boolean;
  callOutMessage?: string;
  callOutType?: CallOutType;
  status: { [key: string]: any };
  isAdmin: boolean;
}

interface State {
  isModalVisible: boolean;
  activeTab: Tabs;
  importRepoAddress: string;
  searchQuery: any;
  tab: AdminTabs;
}

interface RepositoryItemProps {
  repoName: string;
  repoURI: string;
  deleteRepo: () => void;
  indexRepo: () => void;
  initRepoCommand: () => void;
  hasInitCmd?: boolean;
  status: any;
  isAdmin: boolean;
}

const Caption = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  text-align: center;
  line-height: 16px;
`;

interface ProgressProps {
  progress: number;
  children: ReactNode;
}

const Progress = (props: ProgressProps) => (
  <InlineProgressContainer>
    <RelativeContainer>
      <EuiProgress size="l" value={props.progress} max={100} />
      <Caption>{props.children}</Caption>
    </RelativeContainer>
  </InlineProgressContainer>
);

const RepositoryItem = (props: RepositoryItemProps) => {
  const initRepoButton = (
    <EuiButtonIcon iconType="play" aria-label="run init command" onClick={props.initRepoCommand} />
  );

  const progressPrompt = props.status
    ? `${
        props.status.progress < 0
          ? 'Clone Failed'
          : `Cloning...${props.status.progress.toFixed(2)}%`
      }`
    : '';

  const progress = props.status && props.status.progress && props.status.progress < 100 && (
    <Progress progress={props.status.progress}>{progressPrompt}</Progress>
  );

  const adminButtons = props.isAdmin ? (
    <div>
      {props.hasInitCmd && initRepoButton}
      <EuiButtonIcon iconType="indexSettings" aria-label="settings" />
      <EuiButtonIcon iconType="indexOpen" aria-label="index" onClick={props.indexRepo} />
      <EuiButtonIcon iconType="trash" aria-label="delete" onClick={props.deleteRepo} />
    </div>
  ) : null;

  return (
    <EuiFlexGroup className="repoItem" wrap={true} justifyContent="spaceBetween">
      <EuiFlexItem>
        <EuiFlexGroup direction="column" justifyContent="spaceBetween">
          <div>
            <Link to={`/${props.repoURI}`}>{props.repoName}</Link>
          </div>
          <div>
            <a href={`//${props.repoURI}`} target="__blank">
              {props.repoURI}
            </a>
          </div>
        </EuiFlexGroup>
      </EuiFlexItem>
      {progress}
      <EuiFlexItem grow={false}>{adminButtons}</EuiFlexItem>
    </EuiFlexGroup>
  );
};

const initialQuery = EuiSearchBar.Query.MATCH_ALL;

class AdminPage extends React.PureComponent<Props, State> {
  public state = {
    isModalVisible: false,
    activeTab: Tabs.GitAddress,
    importRepoAddress: '',
    searchQuery: initialQuery,
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

  public getSideNavItems = () => {
    if (this.state.activeTab === Tabs.GitAddress) {
      return [
        {
          isSelected: true,
          name: 'Git Address',
          id: String(Tabs.GitAddress),
          onClick: this.getTabClickHandler(Tabs.GitAddress),
        },
        {
          isSelected: false,
          name: 'GitHub',
          id: String(Tabs.GitHub),
          onClick: this.getTabClickHandler(Tabs.GitHub),
        },
      ];
    } else if (this.state.activeTab === Tabs.GitHub) {
      return [
        {
          isSelected: false,
          name: 'Git Address',
          id: String(Tabs.GitAddress),
          onClick: this.getTabClickHandler(Tabs.GitAddress),
        },
        {
          isSelected: true,
          name: 'GitHub',
          id: String(Tabs.GitHub),
          onClick: this.getTabClickHandler(Tabs.GitHub),
        },
      ];
    } else {
      return [];
    }
  };

  public onImportAddressChange = (e: ChangeEvent<HTMLInputElement>) => {
    this.setState({ importRepoAddress: e.target.value });
  };

  public importRepo = () => {
    this.props.importRepo(this.state.importRepoAddress);
    this.setState({ importRepoAddress: '' });
  };

  public getTabContent = () => {
    if (this.state.activeTab === Tabs.GitAddress) {
      return (
        <React.Fragment>
          <label className="addressInputLabel">Git Address:</label>
          <EuiFieldText
            className="importModalInput"
            placeholder=""
            value={this.state.importRepoAddress}
            onChange={this.onImportAddressChange}
            aria-label="Use aria labels when no actual label is in use"
          />
          <EuiButton
            onClick={this.importRepo}
            isLoading={this.props.importLoading}
            className="importModalButton"
          >
            Add
          </EuiButton>
        </React.Fragment>
      );
    } else if (this.state.activeTab === Tabs.GitHub) {
      return null;
    } else {
      throw new Error('Unknown Tab');
    }
  };

  public getTabClickHandler = (tab: Tabs) => () => {
    this.setState({ activeTab: tab });
  };

  public openModal = () => {
    this.setState({ isModalVisible: true });
  };

  public closeModal = () => {
    this.setState({ isModalVisible: false });
    this.props.hideCallOut();
  };

  public getDeleteRepoHandler = (uri: string) => () => {
    this.props.deleteRepo(uri);
  };

  public getIndexRepoHandler = (uri: string) => () => {
    this.props.indexRepo(uri);
  };

  public onSearchQueryChange = (q: any) => {
    this.setState({
      searchQuery: q.query,
    });
  };

  public filterRepos = () => {
    const { text } = this.state.searchQuery;
    if (text) {
      return this.props.repositories.filter(repo =>
        repo.uri.toLowerCase().includes(text.toLowerCase())
      );
    } else {
      return this.props.repositories;
    }
  };

  public renderTabContent = () => {
    switch (this.state.tab) {
      case AdminTabs.projects: {
        const repos = this.filterRepos();
        const repositoriesCount = repos.length;
        const items = [
          {
            name: '',
            id: '',
            items: this.getSideNavItems(),
          },
        ];
        const { callOutMessage, status, showCallOut, callOutType, isAdmin } = this.props;

        const callOut = showCallOut && (
          <EuiCallOut title={callOutTitle[callOutType!]} color={callOutType} iconType="cross">
            {callOutMessage}
          </EuiCallOut>
        );

        const importRepositoryModal = (
          <EuiOverlayMask>
            <EuiModal onClose={this.closeModal} className="importModal">
              <EuiTitle size="s" className="importModalTitle">
                <h1>Import Repository</h1>
              </EuiTitle>
              <EuiFlexGroup>
                <EuiFlexItem grow={false}>
                  <EuiSideNav items={items} />
                </EuiFlexItem>
                <FlexGrowContainer>
                  <EuiFlexItem className="tabContent">{this.getTabContent()}</EuiFlexItem>
                  {callOut}
                </FlexGrowContainer>
              </EuiFlexGroup>
            </EuiModal>
          </EuiOverlayMask>
        );

        const repoList = repos.map(repo => (
          <RepositoryItem
            key={repo.uri}
            repoName={repo.name || ''}
            repoURI={repo.uri}
            deleteRepo={this.getDeleteRepoHandler(repo.uri)}
            indexRepo={this.getIndexRepoHandler(repo.uri)}
            initRepoCommand={this.props.initRepoCommand.bind(this, repo.uri)}
            hasInitCmd={this.hasInitCmd(repo)}
            status={status[repo.uri]}
            isAdmin={isAdmin}
          />
        ));
        return (
          <React.Fragment>
            <EuiTitle>
              <h2>{repositoriesCount} repositories</h2>
            </EuiTitle>
            <div>
              <EuiFlexGroup>
                <EuiFlexItem>
                  <EuiSearchBar className="searchBox" onChange={this.onSearchQueryChange} />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    className="addRepoButton"
                    onClick={this.openModal}
                    iconType="plusInCircle"
                    aria-label="add"
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            </div>
            <EuiPageContentBody>
              <div>{repoList}</div>
            </EuiPageContentBody>
            {this.state.isModalVisible && importRepositoryModal}
          </React.Fragment>
        );
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

  private hasInitCmd(repo: Repository) {
    if (this.props.repoConfigs) {
      const config = this.props.repoConfigs[repo.uri];
      return config && !!config.init;
    }
    return false;
  }
}

const mapStateToProps = (state: RootState) => ({
  repositories: state.repository.repositories,
  importLoading: state.repository.importLoading,
  repoConfigs: state.repository.repoConfigs,
  showCallOut: state.repository.showCallOut,
  callOutMessage: state.repository.callOutMessage,
  callOutType: state.repository.callOutType,
  status: state.status.status,
  isAdmin: state.userConfig.isAdmin,
});

const mapDispatchToProps = {
  deleteRepo,
  importRepo,
  indexRepo,
  initRepoCommand,
  hideCallOut,
};

export const Admin = connect(
  mapStateToProps,
  mapDispatchToProps
)(AdminPage);
