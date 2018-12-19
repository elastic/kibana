/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiLink, EuiPopover } from '@elastic/eui';
import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { FileTree, FileTreeItemType } from '../../../model';
import { fetchDirectory, FetchRepoTreePayload } from '../../actions';
import { RootState } from '../../reducers';

interface Props {
  revision: string;
  repoUri: string;
  paths: string[];
  dir?: FileTree;
  fetchDirectory: (payload: FetchRepoTreePayload) => void;
}
interface State {
  isOpen: boolean;
}
class FileListDropdownComponent extends React.Component<Props, State> {
  public state = {
    isOpen: false,
  };

  public onClick = (e: React.MouseEvent<HTMLSpanElement>) => {
    const { repoUri, revision, paths } = this.props;
    this.props.fetchDirectory({
      uri: repoUri,
      revision,
      path: paths.slice(0, paths.length - 1).join('/'),
    });
    this.setState({ isOpen: true });
    e.preventDefault();
  };

  public close = () => {
    this.setState({ isOpen: false });
  };

  public render() {
    const path = this.props.paths[this.props.paths.length - 1];
    const button = (
      <span onClick={this.onClick} className="breadcrumbs" role="button">
        {path}
      </span>
    );
    return (
      <EuiPopover
        id="filelist_dropdown"
        isOpen={this.state.isOpen}
        closePopover={this.close}
        button={button}
      >
        {this.renderSiblings()}
      </EuiPopover>
    );
  }

  private renderSiblings() {
    const { repoUri, revision } = this.props;
    if (this.props.dir && this.props.dir.children) {
      const links = this.props.dir.children.map(p => {
        const type = p.type === FileTreeItemType.Directory ? 'tree' : 'blob';
        return (
          <div key={p.path}>
            <EuiLink href={`#${repoUri}/${type}/${revision}/${p.path}`}>{p.name}</EuiLink>
          </div>
        );
      });
      return <Fragment>{links}</Fragment>;
    } else {
      return false;
    }
  }
}
const mapStateToProps = (state: RootState) => ({
  dir: state.file.opendir,
});

const mapDispatchToProps = {
  fetchDirectory,
};

export const FileListDropdown = connect(
  mapStateToProps,
  mapDispatchToProps
)(FileListDropdownComponent);
