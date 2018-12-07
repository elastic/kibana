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
import { MainRouteParams, PathTypes } from '../../common/types';
import { RootState } from '../../reducers';

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: Tree;
  closeTreePath: (path: string) => void;
  fetchRepoTree: (p: FetchRepoTreePayload) => void;
  openedPaths: string[];
}

class CodeFileTree extends React.PureComponent<Props> {
  public fetchTree(path = '') {
    const { resource, org, repo, revision } = this.props.match.params;
    this.props.fetchRepoTree({
      uri: `${resource}/${org}/${repo}`,
      revision,
      path: path || '',
    });
  }

  public onClick = (node: Tree) => {
    const { resource, org, repo, revision } = this.props.match.params;
    const pathType = node.type === FileTreeItemType.File ? PathTypes.blob : PathTypes.tree;
    this.props.history.push(`/${resource}/${org}/${repo}/${pathType}/${revision}/${node.path}`);
  };

  public getTreeToggler = (path: string) => () => {
    if (this.props.openedPaths.includes(path)) {
      this.props.closeTreePath(path);
    } else {
      this.fetchTree(path);
    }
  };

  public getItemRenderer = (node: Tree, forceOpen: boolean) => () => {
    const className = this.props.match.params.path === node.path ? 'activeFileNode' : 'fileNode';
    const onClick = () => this.onClick(node);
    switch (node.type) {
      case FileTreeItemType.Directory: {
        const onFolderClick = () => {
          this.getTreeToggler(node.path || '')();
          this.onClick(node);
        };
        return (
          <div onClick={onFolderClick} className={className}>
            <EuiIcon type={forceOpen ? 'arrowDown' : 'arrowRight'} />
            {`${node.name}/`}
          </div>
        );
      }
      case FileTreeItemType.Submodule: {
        return (
          <div onClick={onClick} className={className}>
            {node.name}
          </div>
        );
      }
      case FileTreeItemType.File: {
        return (
          <div onClick={onClick} className={className}>
            {node.name}
          </div>
        );
      }
    }
  };

  public treeToItems = (node: Tree): any => {
    const forceOpen = this.props.openedPaths.includes(node.path!);
    const data = {
      id: node.name,
      name: node.name,
      isSelected: false,
      renderItem: this.getItemRenderer(node, forceOpen),
      forceOpen,
    };
    if (forceOpen && node.type === 1 && node.children && node.children.length > 0) {
      data.items = node.children.map(this.treeToItems);
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
    return (
      this.props.node && (
        <EuiSideNav items={items} className="sideNavTree" style={{ overflow: 'auto' }} />
      )
    );
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
