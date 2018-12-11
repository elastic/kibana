/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

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
import { colors } from '../../style/variables';
import { Editor } from '../editor/editor';
import { Blame } from './blame';
import { CommitHistory } from './commit_history';
import { Directory } from './directory';

const LARGE_Z_INDEX_NUMBER = 99;

const ButtonsContainer = styled.div`
  position: absolute;
  right: 1rem;
  z-index: ${LARGE_Z_INDEX_NUMBER};
`;

const Button = styled.button`
  width: 96px;
  height: 24px;
  outline: none !important;
  color: ${colors.textBlue};
  border: 1px solid ${colors.borderGrey};
  background-color: ${colors.white};
  box-shadow: none;
  &:first-child {
    border-radius: 4px 0 0 4px;
  }
  &:last-child {
    border-radius: 0 4px 4px 0;
  }
  &:focus {
    outline: none;
    box-shadow: none;
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

interface Props extends RouteComponentProps<MainRouteParams> {
  tree: FileTree;
  file: FetchFileResponse | undefined;
  commits: CommitInfo[];
  blames: GitBlame[];
}

interface State {
  showBlame: boolean;
}

class CodeContent extends React.PureComponent<Props, State> {
  public state = {
    showBlame: false,
  };

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

  public showBlame = () => {
    this.setState({ showBlame: true });
  };

  public hideBlame = () => {
    this.setState({ showBlame: false });
  };

  public renderButtons() {
    return (
      <ButtonsContainer>
        <Button onClick={this.hideBlame}>Raw</Button>
        <Button onClick={this.showBlame}>Blame</Button>
        <Button onClick={this.hideBlame}>History</Button>
      </ButtonsContainer>
    );
  }

  public render() {
    const { file, blames, commits, match, tree } = this.props;
    const { path, pathType, resource, org, repo } = match.params;
    const repoUri = `${resource}/${org}/${repo}`;
    if (pathType === PathTypes.tree) {
      const node = this.findNode(path ? path.split('/') : [], tree);
      return (
        <div>
          <div>
            <Directory node={node} />
          </div>
          <div>
            <CommitHistory commits={commits} repoUri={repoUri} />
          </div>
        </div>
      );
    } else if (pathType === PathTypes.blob) {
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
      const blame = this.state.showBlame && (
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
