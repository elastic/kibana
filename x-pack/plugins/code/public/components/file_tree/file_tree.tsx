/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { EuiIcon, EuiSideNav } from '@elastic/eui';

import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { FileTree as Tree, FileTreeItemType } from '../../../model';
import { closeTreePath, fetchRepoTree, FetchRepoTreePayload } from '../../actions';
import { EuiSideNavItem, MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';
interface Props extends RouteComponentProps<MainRouteParams> {
  node?: Tree;
  closeTreePath: (path: string) => void;
  fetchRepoTree: (p: FetchRepoTreePayload) => void;
  openedPaths: string[];
}

export class CodeFileTree extends React.Component<Props> {
  public fetchTree(path = '') {
    const { resource, org, repo, revision } = this.props.match.params;
    this.props.fetchRepoTree({
      uri: `${resource}/${org}/${repo}`,
      revision,
      path: path || '',
    });
  }

  public onClick = (node: Tree) => {
    const { resource, org, repo, revision, path } = this.props.match.params;
    if (!(path === node.path)) {
      const pathType = node.type === FileTreeItemType.File ? PathTypes.blob : PathTypes.tree;
      this.props.history.push(`/${resource}/${org}/${repo}/${pathType}/${revision}/${node.path}`);
    }
  };

  public getTreeToggler = (path: string) => () => {
    if (this.props.openedPaths.includes(path)) {
      this.props.closeTreePath(path);
    } else {
      this.fetchTree(path);
    }
  };

  public flattenDirectory: (node: Tree) => Tree[] = (node: Tree) => {
    if (node.childrenCount === 1) {
      return [node, ...this.flattenDirectory(node.children![0])];
    } else {
      return [node];
    }
  };

  public getItemRenderer = (node: Tree, forceOpen: boolean) => () => {
    const className = this.props.match.params.path === node.path ? 'activeFileNode' : 'fileNode';
    const onClick = () => this.onClick(node);
    switch (node.type) {
      case FileTreeItemType.Directory: {
        const onFolderClick = (e: React.MouseEvent<HTMLDivElement>) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'DIV') {
            this.onClick(node);
          } else {
            this.getTreeToggler(node.path || '')();
          }
        };
        return (
          <div onClick={onFolderClick} className={className} role="button">
            <EuiIcon type={forceOpen ? 'arrowDown' : 'arrowRight'} />
            {`${node.name}/`}
          </div>
        );
      }
      case FileTreeItemType.Submodule: {
        return (
          <div onClick={onClick} className={className} role="button">
            {node.name}
          </div>
        );
      }
      case FileTreeItemType.File: {
        return (
          <div onClick={onClick} className={className} role="button">
            {node.name}
          </div>
        );
      }
    }
  };

  public treeToItems = (node: Tree): EuiSideNavItem => {
    const forceOpen = this.props.openedPaths.includes(node.path!);
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
