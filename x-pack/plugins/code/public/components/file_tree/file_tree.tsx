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
import { closeTreePath, fetchRepoTree, FetchRepoTreePayload } from '../../actions';
import { EuiSideNavItem, MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';

const DirectoryNode = styled.span`
  margin-left: ${theme.euiSizeXs};
  vertical-align: middle;
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: Tree;
  closeTreePath: (path: string) => void;
  fetchRepoTree: (p: FetchRepoTreePayload) => void;
  openedPaths: string[];
}

export class CodeFileTree extends React.Component<Props> {
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

  public getTreeToggler = (path: string, isDir: boolean) => () => {
    if (this.props.openedPaths.includes(path)) {
      this.props.closeTreePath(path);
    } else {
      this.fetchTree(path, isDir);
    }
  };

  public flattenDirectory: (node: Tree) => Tree[] = (node: Tree) => {
    if (node.childrenCount === 1 && node.children![0].type === FileTreeItemType.Directory) {
      return [node, ...this.flattenDirectory(node.children![0])];
    } else {
      return [node];
    }
  };

  public getItemRenderer = (node: Tree, forceOpen: boolean) => () => {
    const className =
      this.props.match.params.path === node.path ? 'code-active-file-node' : 'code-file-node';
    const onClick = (evt: React.MouseEvent<Element>) => {
      // @ts-ignore
      if (evt.target && evt.target.tagName === 'I') {
        return;
      }
      this.onClick(node);
    };
    switch (node.type) {
      case FileTreeItemType.Directory: {
        const onFolderClick = () => {
          this.getTreeToggler(node.path || '', true)();
        };
        return (
          <div
            data-test-subj={`codeFileTreeNode-Directory-${node.path}`}
            className={className}
            role="button"
            onClick={onClick}
          >
            {forceOpen ? (
              <EuiIcon
                type="arrowDown"
                size="s"
                color="subdued"
                className="codeFileTree--icon"
                onClick={onFolderClick}
              />
            ) : (
              <EuiIcon
                type="arrowRight"
                size="s"
                color="subdued"
                className="codeFileTree--icon"
                onClick={onFolderClick}
              />
            )}
            <EuiIcon type={forceOpen ? 'folderOpen' : 'folderClosed'} color="subdued" />
            <DirectoryNode>
              <EuiText size="s" grow={false} className="eui-displayInlineBlock">
                {`${node.name}/`}
              </EuiText>
            </DirectoryNode>
          </div>
        );
      }
      case FileTreeItemType.Submodule: {
        return (
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
        );
      }
      case FileTreeItemType.Link: {
        return (
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
        );
      }
      case FileTreeItemType.File: {
        return (
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
        );
      }
    }
  };

  public treeToItems = (node: Tree): EuiSideNavItem => {
    const forceOpen =
      node.type === FileTreeItemType.Directory
        ? this.props.openedPaths.includes(node.path!)
        : false;
    const data: EuiSideNavItem = {
      id: node.name,
      name: node.name,
      isSelected: false,
      renderItem: this.getItemRenderer(node, forceOpen),
      forceOpen,
      onClick: () => void 0,
    };
    if (node.type === FileTreeItemType.Directory && Number(node.childrenCount) > 0 && forceOpen) {
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
        data.forceOpen = this.props.openedPaths.includes(flattenNode.path!);
        data.renderItem = this.getItemRenderer(flattenNode, data.forceOpen);
        if (Number(flattenNode.childrenCount) > 0) {
          data.items = flattenNode.children!.map(this.treeToItems);
        }
      } else {
        data.items = node.children!.map(this.treeToItems);
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
}

const mapStateToProps = (state: RootState) => ({
  node: state.file.tree,
  openedPaths: state.file.openedPaths,
});

const mapDispatchToProps = {
  fetchRepoTree,
  closeTreePath,
};

export const FileTree = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(CodeFileTree)
);
