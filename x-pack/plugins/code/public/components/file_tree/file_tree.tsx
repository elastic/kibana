/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiIcon, EuiSideNav, EuiText } from '@elastic/eui';
import classes from 'classnames';

import theme from '@elastic/eui/dist/eui_theme_light.json';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { FileTree as Tree, FileTreeItemType } from '../../../model';
import { closeTreePath, fetchRepoTree, FetchRepoTreePayload, openTreePath } from '../../actions';
import { EuiSideNavItem, MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';

const DirectoryNode = styled.span`
  margin-left: ${theme.euiSizeXs};
  vertical-align: middle;
`;

const Container = styled.div`
  display: flex;
  flex-direction: row;
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: Tree;
  closeTreePath: (paths: string) => void;
  openTreePath: (paths: string) => void;
  fetchRepoTree: (p: FetchRepoTreePayload) => void;
  openedPaths: string[];
  treeLoading?: boolean;
}

export class CodeFileTree extends React.Component<Props> {
  public componentDidUpdate(prevProps: Readonly<Props>): void {
    const { openedPaths, match, treeLoading } = this.props;
    const path = match.params.path;
    if (path) {
      if (prevProps.match.params.path !== path || prevProps.treeLoading !== treeLoading) {
        if (!openedPaths.includes(path)) {
          this.props.openTreePath(path);
        }
      }
    }
  }

  public componentDidMount(): void {
    const { path } = this.props.match.params;
    if (path) {
      this.props.openTreePath(path);
    }
  }

  public fetchTree(path = '', isDir: boolean) {
    const { resource, org, repo, revision } = this.props.match.params;
    this.props.fetchRepoTree({
      uri: `${resource}/${org}/${repo}`,
      revision,
      path: path || '',
      isDir,
    });
  }

  public onClick = (node: Tree) => {
    const { resource, org, repo, revision, path } = this.props.match.params;
    if (!(path === node.path)) {
      let pathType: PathTypes;
      if (node.type === FileTreeItemType.Link || node.type === FileTreeItemType.File) {
        pathType = PathTypes.blob;
      } else {
        pathType = PathTypes.tree;
      }
      this.props.history.push(`/${resource}/${org}/${repo}/${pathType}/${revision}/${node.path}`);
    }
  };

  public toggleTree = (path: string, isDir: boolean) => {
    if (this.isPathOpen(path)) {
      this.props.closeTreePath(path);
    } else {
      this.fetchTree(path, isDir);
      this.props.openTreePath(path);
    }
  };

  public flattenDirectory: (node: Tree) => Tree[] = (node: Tree) => {
    if (node.childrenCount === 1 && node.children![0].type === FileTreeItemType.Directory) {
      return [node, ...this.flattenDirectory(node.children![0])];
    } else {
      return [node];
    }
  };

  public getItemRenderer = (node: Tree, forceOpen: boolean, flattenFrom?: Tree) => () => {
    const className = 'code-file-node';
    let bg = null;
    if (this.props.match.params.path === node.path) {
      bg = <div className="code-full-width-file-node" />;
    }
    const onClick = () => {
      const path = flattenFrom ? flattenFrom.path! : node.path!;
      this.toggleTree(path, node.type === FileTreeItemType.Directory);
      this.onClick(node);
    };
    switch (node.type) {
      case FileTreeItemType.Directory: {
        return (
          <Container>
            <div
              data-test-subj={`codeFileTreeNode-Directory-${node.path}`}
              className={className}
              role="button"
              onClick={onClick}
            >
              {forceOpen ? (
                <EuiIcon type="arrowDown" size="s" color="subdued" className="codeFileTree--icon" />
              ) : (
                <EuiIcon
                  type="arrowRight"
                  size="s"
                  color="subdued"
                  className="codeFileTree--icon"
                />
              )}
              <EuiIcon type={forceOpen ? 'folderOpen' : 'folderClosed'} color="subdued" />
              <DirectoryNode>
                <EuiText size="s" grow={false} className="eui-displayInlineBlock">
                  {`${node.name}/`}
                </EuiText>
              </DirectoryNode>
            </div>
            {bg}
          </Container>
        );
      }
      case FileTreeItemType.Submodule: {
        return (
          <Container>
            <div
              data-test-subj={`codeFileTreeNode-Submodule-${node.path}`}
              onClick={onClick}
              className={classes(className, 'code-file-tree-file')}
              role="button"
            >
              <EuiIcon type="submodule" color="subdued" />
              <DirectoryNode>
                <EuiText size="s" grow={false} className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </DirectoryNode>
            </div>
            {bg}
          </Container>
        );
      }
      case FileTreeItemType.Link: {
        return (
          <Container>
            <div
              data-test-subj={`codeFileTreeNode-Link-${node.path}`}
              onClick={onClick}
              className={classes(className, 'code-file-tree-file')}
              role="button"
            >
              <EuiIcon type="symlink" color="subdued" />
              <DirectoryNode>
                <EuiText size="s" grow={false} className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </DirectoryNode>
            </div>
            {bg}
          </Container>
        );
      }
      case FileTreeItemType.File: {
        return (
          <Container>
            <div
              data-test-subj={`codeFileTreeNode-File-${node.path}`}
              onClick={onClick}
              className={classes(className, 'code-file-tree-file')}
              role="button"
            >
              <EuiIcon type="document" color="subdued" />
              <DirectoryNode>
                <EuiText size="s" grow={false} className="eui-displayInlineBlock">
                  {node.name}
                </EuiText>
              </DirectoryNode>
            </div>
            {bg}
          </Container>
        );
      }
    }
  };

  public treeToItems = (node: Tree): EuiSideNavItem => {
    const forceOpen =
      node.type === FileTreeItemType.Directory ? this.isPathOpen(node.path!) : false;
    const data: EuiSideNavItem = {
      id: node.name,
      name: node.name,
      isSelected: false,
      renderItem: this.getItemRenderer(node, forceOpen),
      forceOpen,
      onClick: () => void 0,
    };
    if (node.type === FileTreeItemType.Directory && Number(node.childrenCount) > 0) {
      const nodes = this.flattenDirectory(node);
      const length = nodes.length;
      if (length > 1 && !(this.props.match.params.path === node.path)) {
        data.name = nodes.map(n => n.name).join('/');
        data.id = data.name;
        const lastNode = nodes[length - 1];
        const flattenNode = {
          ...lastNode,
          name: data.name,
          id: data.id,
        };
        data.forceOpen = this.isPathOpen(node.path!);
        data.renderItem = this.getItemRenderer(flattenNode, data.forceOpen, node);
        if (data.forceOpen && Number(flattenNode.childrenCount) > 0) {
          data.items = flattenNode.children!.map(this.treeToItems);
        }
      } else if (forceOpen && node.children) {
        data.items = node.children.map(this.treeToItems);
      }
    }
    return data;
  };

  public render() {
    const items = [
      {
        name: '',
        id: '',
        items: (this.props.node!.children || []).map(this.treeToItems),
      },
    ];
    return this.props.node && <EuiSideNav items={items} />;
  }

  private isPathOpen(path: string) {
    return this.props.openedPaths.some(p => p.startsWith(path));
  }
}

const mapStateToProps = (state: RootState) => ({
  node: state.file.tree,
  openedPaths: state.file.openedPaths,
  treeLoading: state.file.loading,
});

const mapDispatchToProps = {
  fetchRepoTree,
  closeTreePath,
  openTreePath,
};

export const FileTree = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CodeFileTree)
);
