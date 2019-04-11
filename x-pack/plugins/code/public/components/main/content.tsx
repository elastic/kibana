/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonGroup, EuiTitle } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import 'github-markdown-css/github-markdown.css';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import Markdown from 'react-markdown';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router-dom';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import chrome from 'ui/chrome';

import { RepositoryUtils } from '../../../common/repository_utils';
import { FileTree, FileTreeItemType, SearchScope, WorkerReservedProgress } from '../../../model';
import { CommitInfo, ReferenceInfo } from '../../../model/commit';
import { changeSearchScope, FetchFileResponse, fetchMoreCommits } from '../../actions';
import { MainRouteParams, PathTypes } from '../../common/types';
import { RepoState, RepoStatus, RootState } from '../../reducers';
import {
  currentTreeSelector,
  hasMoreCommitsSelector,
  repoUriSelector,
  statusSelector,
  treeCommitsSelector,
} from '../../selectors';
import { history } from '../../utils/url';
import { Editor } from '../editor/editor';
import { CloneStatus } from './clone_status';
import { CommitHistory, CommitHistoryLoading } from './commit_history';
import { Directory } from './directory';
import { ErrorPanel } from './error_panel';
import { NotFound } from './not_found';
import { TopBar } from './top_bar';

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  & > *:first-child {
    margin-right: ${theme.euiSizeS};
  }
  & .euiButton {
    min-width: ${theme.euiSizeS};
  }
`;

const EditorBlameContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  max-height: calc(100% - 97px);
`;

const DirectoryViewContainer = styled.div`
  overflow: auto;
  flex-grow: 1;
`;
const CommitHistoryContainer = styled.div`
  overflow: auto;
  flex-grow: 1;
`;

const Root = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: calc(100% - 256px);
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  isNotFound: boolean;
  repoStatus?: RepoStatus;
  tree: FileTree;
  file: FetchFileResponse | undefined;
  currentTree: FileTree | undefined;
  commits: CommitInfo[];
  branches: ReferenceInfo[];
  hasMoreCommits: boolean;
  loadingCommits: boolean;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
  fetchMoreCommits(repoUri: string): void;
}
const LANG_MD = 'markdown';

enum ButtonOption {
  Code = 'Code',
  Blame = 'Blame',
  History = 'History',
  Folder = 'Directory',
}

enum ButtonLabel {
  Code = 'Code',
  Content = 'Content',
  Download = 'Download',
  Raw = 'Raw',
}

const Title = styled(EuiTitle)`
  margin: ${theme.euiSizeXS} 0 ${theme.euiSize};
`;

class CodeContent extends React.PureComponent<Props> {
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
    window.open(chrome.addBasePath(`/app/code/repo/${repoUri}/raw/${revision}/${path}`));
  };

  public renderButtons = () => {
    let buttonId: string | undefined;
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
    const currentTree = this.props.currentTree;
    if (
      currentTree &&
      (currentTree.type === FileTreeItemType.File || currentTree.type === FileTreeItemType.Link)
    ) {
      const { isUnsupported, isOversize, isImage, lang } = this.props.file!;
      const isMarkdown = lang === LANG_MD;
      const isText = !isUnsupported && !isOversize && !isImage;

      const buttonOptions = [
        {
          id: ButtonOption.Code,
          label: isText && !isMarkdown ? ButtonLabel.Code : ButtonLabel.Content,
        },
        {
          id: ButtonOption.Blame,
          label: ButtonOption.Blame,
          isDisabled: isUnsupported || isImage || isOversize,
        },
        {
          id: ButtonOption.History,
          label: ButtonOption.History,
        },
      ];
      const rawButtonOptions = [
        { id: 'Raw', label: isText ? ButtonLabel.Raw : ButtonLabel.Download },
      ];

      return (
        <ButtonsContainer>
          <EuiButtonGroup
            buttonSize="s"
            color="primary"
            options={buttonOptions}
            type="single"
            idSelected={buttonId}
            onChange={this.switchButton}
          />
          <EuiButtonGroup
            buttonSize="s"
            color="primary"
            options={rawButtonOptions}
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
            buttonSize="s"
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
          repoScope={this.props.repoScope}
          branches={this.props.branches}
        />
        {this.renderContent()}
      </Root>
    );
  }

  public shouldRenderProgress() {
    if (!this.props.repoStatus) {
      return false;
    }
    const { progress, cloneProgress, state } = this.props.repoStatus;
    return (
      !!progress &&
      state === RepoState.CLONING &&
      progress < WorkerReservedProgress.COMPLETED &&
      !RepositoryUtils.hasFullyCloned(cloneProgress)
    );
  }

  public renderProgress() {
    if (!this.props.repoStatus) {
      return null;
    }
    const { progress, cloneProgress } = this.props.repoStatus;
    const { org, repo } = this.props.match.params;
    return (
      <CloneStatus
        repoName={`${org}/${repo}`}
        progress={progress ? progress : 0}
        cloneProgress={cloneProgress}
      />
    );
  }

  public renderContent() {
    if (this.props.isNotFound) {
      return <NotFound />;
    }
    if (this.shouldRenderProgress()) {
      return this.renderProgress();
    }

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
        const {
          lang: fileLanguage,
          content: fileContent,
          isUnsupported,
          isOversize,
          isImage,
        } = file;
        if (isUnsupported) {
          return (
            <ErrorPanel
              title={<h2>Unsupported File</h2>}
              content="Unfortunately that’s an unsupported file type and we’re unable to render it here."
            />
          );
        }
        if (isOversize) {
          return (
            <ErrorPanel
              title={<h2>File is too big</h2>}
              content="Sorry about that, but we can’t show files that are this big right now."
            />
          );
        }
        if (fileLanguage === LANG_MD) {
          return (
            <div className="markdown-body code-markdown-container">
              <Markdown source={fileContent} escapeHtml={true} skipHtml={true} />
            </div>
          );
        } else if (isImage) {
          const rawUrl = chrome.addBasePath(`/app/code/repo/${repoUri}/raw/${revision}/${path}`);
          return (
            <div className="code-auto-margin">
              <img src={rawUrl} alt={rawUrl} />
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
          <CommitHistoryContainer>
            <InfiniteScroll
              initialLoad={true}
              loadMore={() => !loadingCommits && this.props.fetchMoreCommits(repoUri)}
              hasMore={hasMoreCommits}
              useWindow={false}
              loader={<CommitHistoryLoading />}
            >
              <CommitHistory
                hideLoading={true}
                commits={commits}
                repoUri={repoUri}
                header={
                  <Title>
                    <h3>Commit History</h3>
                  </Title>
                }
              />
            </InfiniteScroll>
          </CommitHistoryContainer>
        );
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  isNotFound: state.file.isNotFound,
  file: state.file.file,
  tree: state.file.tree,
  currentTree: currentTreeSelector(state),
  commits: treeCommitsSelector(state),
  branches: state.file.branches,
  hasMoreCommits: hasMoreCommitsSelector(state),
  loadingCommits: state.file.loadingCommits,
  repoStatus: statusSelector(state, repoUriSelector(state)),
  repoScope: state.search.searchOptions.repoScope.map(r => r.uri),
});

const mapDispatchToProps = {
  fetchMoreCommits,
  onSearchScopeChanged: changeSearchScope,
};

export const Content = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
    // @ts-ignore
  )(CodeContent)
);
