/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  IconType,
  EuiLoadingSpinner,
  EuiSpacer,
} from '@elastic/eui';
import React from 'react';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { FileTree, FileTreeItemType } from '../../../model';
import { MainRouteParams, PathTypes } from '../../common/types';
import { encodeRevisionString } from '../../utils/url';

interface DirectoryNodesProps {
  title: string;
  nodes: FileTree[];
  getUrl: (path: string) => string;
}

const DirectoryNodes = (props: DirectoryNodesProps) => {
  const typeIconMap: { [k: number]: IconType } = {
    [FileTreeItemType.File]: 'document',
    [FileTreeItemType.Directory]: 'folderClosed',
    [FileTreeItemType.Link]: 'symlink',
    [FileTreeItemType.Submodule]: 'submodule',
  };
  const nodes = props.nodes.map(n => (
    <EuiFlexItem key={n.path} grow={false}>
      <Link
        className="code-link"
        to={props.getUrl(n.path!)}
        data-test-subj={`codeFileExplorerNode-${n.name}`}
      >
        <div className="code-directory__node">
          <EuiIcon type={typeIconMap[n.type]} color="subdued" />
          <EuiText size="xs" className="code-fileNodeName eui-textTruncate">
            {n.name}
          </EuiText>
        </div>
      </Link>
    </EuiFlexItem>
  ));
  return (
    <EuiFlexItem className="codeContainer__directoryList">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="s">
            <h3>{props.title}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexGroup wrap direction="row" gutterSize="none" justifyContent="flexStart">
          {nodes}
        </EuiFlexGroup>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: FileTree;
  loading: boolean;
}

export const Directory = withRouter((props: Props) => {
  let files: FileTree[] = [];
  let folders: FileTree[] = [];
  if (props.node && props.node.children) {
    files = props.node.children.filter(
      n => n.type === FileTreeItemType.File || n.type === FileTreeItemType.Link
    );
    folders = props.node.children.filter(
      n => n.type === FileTreeItemType.Directory || n.type === FileTreeItemType.Submodule
    );
  }
  const { resource, org, repo, revision } = props.match.params;
  const getUrl = (pathType: PathTypes) => (path: string) =>
    `/${resource}/${org}/${repo}/${pathType}/${encodeRevisionString(revision)}/${path}`;
  const fileList = <DirectoryNodes nodes={files} title="Files" getUrl={getUrl(PathTypes.blob)} />;
  const folderList = (
    <DirectoryNodes nodes={folders} title="Directories" getUrl={getUrl(PathTypes.tree)} />
  );
  const children = props.loading ? (
    <div>
      <EuiSpacer size="xl" />
      <EuiSpacer size="xl" />
      <EuiText textAlign="center">Loading...</EuiText>
      <EuiSpacer size="m" />
      <EuiText textAlign="center">
        <EuiLoadingSpinner size="xl" />
      </EuiText>
    </div>
  ) : (
    <React.Fragment>
      {files.length > 0 && fileList}
      {folders.length > 0 && folderList}
    </React.Fragment>
  );
  return <EuiFlexGroup direction="column">{children}</EuiFlexGroup>;
});
