/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// @ts-ignore
import { EuiButton, EuiButtonGroup } from '@elastic/eui';
import React from 'react';
import Markdown from 'react-markdown';
import { connect } from 'react-redux';
import { RouteComponentProps } from 'react-router';
import { withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { GitBlame } from '../../../common/git_blame';
import { FileTree } from '../../../model';
import { CommitInfo } from '../../../model/commit';
import { FetchFileResponse } from '../../actions';
import { MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';
import { treeCommitsSelector } from '../../selectors';
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
}

interface State {
  selectedButtonId: string;
}

enum ButtonOption {
  Code = 'Code',
  Blame = 'Blame',
  History = 'History',
}

const Title = styled.div`
  color: #1a1a1a;
  font-size: 20px;
  font-weight: 600;
  margin: 4px 0 18px;
`;

class CodeContent extends React.PureComponent<Props, State> {
  public state = {
    selectedButtonId: ButtonOption.Code,
  };

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
    this.setState({ selectedButtonId: id });
  };

  public openRawFile = () => {
    const { path, resource, org, repo, revision } = this.props.match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    window.open(`../api/code/repo/${repoUri}/blob/${revision}/${path}`);
  };

  public renderButtons = () => {
    return (
      <ButtonsContainer>
        <EuiButtonGroup
          color="primary"
          options={this.buttonOptions}
          type="single"
          idSelected={this.state.selectedButtonId}
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
  };

  public render() {
    const { file, blames, commits, match, tree } = this.props;
    const { path, pathType, resource, org, repo } = match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    if (pathType === PathTypes.tree) {
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
                <EuiButton>View All</EuiButton>
              </React.Fragment>
            }
          />
        </DirectoryViewContainer>
      );
    } else if (pathType === PathTypes.blob) {
      if (this.state.selectedButtonId === ButtonOption.History) {
        return (
          <React.Fragment>
            {this.renderButtons()}
            <CommitHistory
              commits={commits}
              repoUri={repoUri}
              header={<Title>Commit History</Title>}
            />
          </React.Fragment>
        );
      }
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
      const blamesHeight = `calc(100% + ${blames.map(bl => bl.lines).reduce((a, b) => a + 6, 0) *
        18}px)`;
      const showBlame = this.state.selectedButtonId === ButtonOption.Blame;
      const blame = showBlame && (
        <BlameContainer innerRef={this.scrollBlameInResponseOfScrollingEditor}>
          <div style={{ height: blamesHeight }}>
            <Blame blames={blames} lineHeight={18} />
          </div>
        </BlameContainer>
      );
      return (
        <EditorBlameContainer>
          {this.renderButtons()}
          {blame}
          <Editor />
        </EditorBlameContainer>
      );
    } else {
      return null;
    }
  }
}

const mapStateToProps = (state: RootState) => ({
  file: state.file.file,
  tree: state.file.tree,
  commits: treeCommitsSelector(state),
  blames: state.blame.blames,
});

export const Content = withRouter(connect(mapStateToProps)(CodeContent));
