/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiButton, EuiButtonGroup, EuiTitle } from '@elastic/eui';
import { euiSize, euiSizeS, euiSizeXs } from '@elastic/eui/dist/eui_theme_light.json';
import 'github-markdown-css/github-markdown.css';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import Markdown from 'react-markdown';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { FileTree, SearchScope } from '../../../model';
import { CommitInfo } from '../../../model/commit';
import { changeSearchScope, FetchFileResponse, fetchMoreCommits } from '../../actions';
import { MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';
import { hasMoreCommitsSelector, treeCommitsSelector } from '../../selectors';
import { history } from '../../utils/url';
import { Editor } from '../editor/editor';
import { UnsupportedFileIcon } from '../shared/icons';
import { CommitHistory } from './commit_history';
import { Directory } from './directory';
import { TopBar } from './top_bar';
import { UnsupportedFile } from './unsupported_file';

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  & > *:first-child {
    margin-right: ${euiSizeS};
  }
`;

const EditorBlameContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  overflow: auto;
`;

const DirectoryViewContainer = styled.div`
  overflow: auto;
  flex-grow: 1;
`;

const Root = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  tree: FileTree;
  file: FetchFileResponse | undefined;
  commits: CommitInfo[];
  hasMoreCommits: boolean;
  loadingCommits: boolean;
  onSearchScopeChanged: (s: SearchScope) => void;
  fetchMoreCommits(repoUri: string): void;
}

enum ButtonOption {
  Code = 'Code',
  Blame = 'Blame',
  History = 'History',
  Folder = 'Directory',
}

const Title = styled(EuiTitle)`
  margin: ${euiSizeXs} 0 ${euiSize};
`;

class CodeContent extends React.PureComponent<Props> {
  public buttonOptions = [
    {
      id: ButtonOption.Code,
      label: ButtonOption.Code,
    },
    {
      id: ButtonOption.Blame,
      label: ButtonOption.Blame,
    },
    {
      id: ButtonOption.History,
      label: ButtonOption.History,
    },
  ];

  public rawButtonOptions = [{ id: 'Raw', label: 'Raw' }];

  public findNode = (pathSegments: string[], node: FileTree): FileTree | undefined => {
    if (!node) {
      return undefined;
    } else if (pathSegments.length === 0) {
      return node;
    } else if (pathSegments.length === 1) {
      return (node.children || []).find(n => n.name === pathSegments[0]);
    } else {
      const currentFolder = pathSegments.shift();
      const nextNode = (node.children || []).find(n => n.name === currentFolder);
      if (nextNode) {
        return this.findNode(pathSegments, nextNode);
      } else {
        return undefined;
      }
    }
  };

  public switchButton = (id: string) => {
    const { path, resource, org, repo, revision } = this.props.match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    switch (id) {
      case ButtonOption.Code:
        history.push(`/${repoUri}/${PathTypes.blob}/${revision}/${path || ''}`);
        break;
      case ButtonOption.Folder:
        history.push(`/${repoUri}/${PathTypes.tree}/${revision}/${path || ''}`);
        break;
      case ButtonOption.Blame:
        history.push(`/${repoUri}/${PathTypes.blame}/${revision}/${path || ''}`);
        break;
      case ButtonOption.History:
        history.push(`/${repoUri}/${PathTypes.commits}/${revision}/${path || ''}`);
        break;
    }
  };

  public openRawFile = () => {
    const { path, resource, org, repo, revision } = this.props.match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    window.open(`../api/code/repo/${repoUri}/blob/${revision}/${path}`);
  };

  public renderButtons = () => {
    let buttonId = null;
    switch (this.props.match.params.pathType) {
      case PathTypes.blame:
        buttonId = ButtonOption.Blame;
        break;
      case PathTypes.blob:
        buttonId = ButtonOption.Code;
        break;
      case PathTypes.tree:
        buttonId = ButtonOption.Folder;
        break;
      case PathTypes.commits:
        buttonId = ButtonOption.History;
        break;
      default:
        break;
    }
    const { file } = this.props;
    if (file) {
      return (
        <ButtonsContainer>
          <EuiButtonGroup
            color="primary"
            options={this.buttonOptions}
            type="single"
            idSelected={buttonId}
            onChange={this.switchButton}
          />
          <EuiButtonGroup
            color="primary"
            options={this.rawButtonOptions}
            type="single"
            idSelected={''}
            onChange={this.openRawFile}
          />
        </ButtonsContainer>
      );
    } else {
      return (
        <ButtonsContainer>
          <EuiButtonGroup
            color="primary"
            options={[
              {
                id: ButtonOption.Folder,
                label: ButtonOption.Folder,
              },
              {
                id: ButtonOption.History,
                label: ButtonOption.History,
              },
            ]}
            type="single"
            idSelected={buttonId}
            onChange={this.switchButton}
          />
        </ButtonsContainer>
      );
    }
  };

  public render() {
    return (
      <Root>
        <TopBar
          routeParams={this.props.match.params}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          buttons={this.renderButtons()}
        />
        {this.renderContent()}
      </Root>
    );
  }

  public renderContent() {
    const { file, commits, match, tree, hasMoreCommits, loadingCommits } = this.props;
    const { path, pathType, resource, org, repo, revision } = match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    switch (pathType) {
      case PathTypes.tree:
        const node = this.findNode(path ? path.split('/') : [], tree);
        return (
          <DirectoryViewContainer>
            <Directory node={node} />
            <CommitHistory
              commits={commits}
              repoUri={repoUri}
              header={
                <React.Fragment>
                  <Title>
                    <h3>Recent Commits</h3>
                  </Title>
                  <EuiButton
                    href={`#/${resource}/${org}/${repo}/${PathTypes.commits}/${revision}/${path ||
                      ''}`}
                  >
                    View All
                  </EuiButton>
                </React.Fragment>
              }
            />
          </DirectoryViewContainer>
        );
      case PathTypes.blob:
        if (!file) {
          return null;
        }
        const { lang: fileLanguage, content: fileContent, url, isUnsupported } = file;
        if (isUnsupported) {
          return (
            <UnsupportedFile
              icon={<UnsupportedFileIcon />}
              title={<h2>Unsupported File</h2>}
              content="Unfortunately that’s an unsupported file type and we’re unable to render it here."
            />
          );
        }
        if (fileLanguage === 'markdown') {
          return (
            <div className="markdown-body markdownContainer">
              <Markdown source={fileContent} escapeHtml={true} skipHtml={true} />
            </div>
          );
        } else if (this.props.file!.isImage) {
          return (
            <div className="autoMargin">
              <img src={url} alt={url} />
            </div>
          );
        }
        return (
          <EditorBlameContainer>
            <Editor showBlame={false} />
          </EditorBlameContainer>
        );
      case PathTypes.blame:
        return (
          <EditorBlameContainer>
            <Editor showBlame={true} />
          </EditorBlameContainer>
        );
      case PathTypes.commits:
        return (
          <React.Fragment>
            <InfiniteScroll
              initialLoad={true}
              loadMore={() => !loadingCommits && this.props.fetchMoreCommits(repoUri)}
              hasMore={!loadingCommits && hasMoreCommits}
              useWindow={true}
              loader={
                <div className="loader" key={0}>
                  Loading ...
                </div>
              }
            >
              <CommitHistory
                commits={commits}
                repoUri={repoUri}
                header={
                  <Title>
                    <h3>Commit History</h3>
                  </Title>
                }
              />
            </InfiniteScroll>
          </React.Fragment>
        );
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  file: state.file.file,
  tree: state.file.tree,
  commits: treeCommitsSelector(state),
  hasMoreCommits: hasMoreCommitsSelector(state),
  loadingCommits: state.file.loadingCommits,
});

const mapDispatchToProps = {
  fetchMoreCommits,
  onSearchScopeChanged: changeSearchScope,
};

export const Content = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CodeContent)
);
