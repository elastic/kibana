/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiButton, EuiButtonGroup } from '@elastic/eui';
import 'github-markdown-css/github-markdown.css';
import React from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import Markdown from 'react-markdown';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { GitBlame } from '../../../common/git_blame';
import { FileTree } from '../../../model';
import { CommitInfo } from '../../../model/commit';
import { FetchFileResponse, fetchMoreCommits } from '../../actions';
import { MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';
import { hasMoreCommitsSelector, treeCommitsSelector } from '../../selectors';
import { history } from '../../utils/url';
import { Editor } from '../editor/editor';
import { Blame } from './blame';
import { CommitHistory } from './commit_history';
import { Directory } from './directory';

const LARGE_Z_INDEX_NUMBER = 99;

const ButtonsContainer = styled.div`
  display: flex;
  flex-direction: row;
  position: absolute;
  right: 1rem;
  z-index: ${LARGE_Z_INDEX_NUMBER};
  & > div:first-child {
    margin-right: 8px;
  }
`;

const EditorBlameContainer = styled.div`
  position: relative;
  display: flex;
  flex-direction: row;
  flex-grow: 1;
  overflow: auto;
`;

const BlameContainer = styled.div`
  flex-grow: 3;
  flex-basis: 400px;
  height: 100%;
  overflow: auto;
`;

const DirectoryViewContainer = styled.div`
  overflow: auto;
  flex-grow: 1;
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  tree: FileTree;
  file: FetchFileResponse | undefined;
  commits: CommitInfo[];
  blames: GitBlame[];
  hasMoreCommits: boolean;
  loadingCommits: boolean;
  fetchMoreCommits(repoUri: string): void;
}

enum ButtonOption {
  Code = 'Code',
  Blame = 'Blame',
  History = 'History',
  Folder = 'Folder',
}

const Title = styled.div`
  color: #1a1a1a;
  font-size: 20px;
  font-weight: 600;
  margin: 4px 0 18px;
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

  public scrollBlameInResponseOfScrollingEditor = (ele: HTMLDivElement) => {
    const observer = new MutationObserver(records => {
      if (!ele) {
        observer.disconnect();
        return;
      }
      const target = records[records.length - 1].target as HTMLElement;
      const scrollTop = -parseInt(target.style.top!, 10);
      ele.scrollTop = scrollTop;
    });
    const targetNode = document.querySelector('#mainEditor:first-child:first-child:first-child');
    observer.observe(targetNode!, {
      attributes: true,
      subtree: true,
    });
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

  public renderButtons = (buttonId: ButtonOption) => {
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
    const { file, blames, commits, match, tree, hasMoreCommits, loadingCommits } = this.props;
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
                  <Title>Recent Commits</Title>
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
        const { lang: fileLanguage, content: fileContent, url } = file;
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
            {this.renderButtons(ButtonOption.Code)}
            <Editor />
          </EditorBlameContainer>
        );
      case PathTypes.blame:
        const blamesHeight = `calc(100% + ${blames.map(bl => bl.lines).reduce((a, b) => a + 6, 0) *
          18}px)`;
        const blame = (
          <BlameContainer innerRef={this.scrollBlameInResponseOfScrollingEditor}>
            <div style={{ height: blamesHeight }}>
              <Blame blames={blames} lineHeight={18} />
            </div>
          </BlameContainer>
        );
        return (
          <EditorBlameContainer>
            {this.renderButtons(ButtonOption.Blame)}
            {blame}
            <Editor />
          </EditorBlameContainer>
        );
      case PathTypes.commits:
        return (
          <React.Fragment>
            {this.renderButtons(ButtonOption.History)}
            <InfiniteScroll
              initialLoad={false}
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
                header={<Title>Commit History</Title>}
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
  blames: state.blame.blames,
  hasMoreCommits: hasMoreCommitsSelector(state),
  loadingCommits: state.file.loadingCommits,
});

const mapDispatchToProps = {
  fetchMoreCommits,
};

export const Content = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CodeContent)
);
