/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, EuiTitle, IconType } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { FileTree, FileTreeItemType } from '../../../model';
import { MainRouteParams, PathTypes } from '../../common/types';
import { encodeRevisionString } from '../../utils/url';

const Root = styled.div`
  padding: ${theme.paddingSizes.m};
`;

const DirectoryNodesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const Title = styled(EuiTitle)`
  margin: ${theme.euiSizeXS} 0 ${theme.euiSize};
`;

const Container = styled.div`
  &:not(:first-child) {
    margin-top: calc(20rem / 14);
  }
`;

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
    <Link
      className="code-link"
      key={n.path}
      to={props.getUrl(n.path!)}
      data-test-subj={`codeFileExplorerNode-${n.name}`}
    >
      <div className="code-directory__node">
        <EuiIcon type={typeIconMap[n.type]} />
        <span className="code-fileNodeName eui-textTruncate">{n.name}</span>
      </div>
    </Link>
  ));
  return (
    <Container>
      <Title size="s">
        <h3>{props.title}</h3>
      </Title>
      <DirectoryNodesContainer>{nodes}</DirectoryNodesContainer>
    </Container>
  );
};

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: FileTree;
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
  return (
    <Root>
      {files.length > 0 && fileList}
      {folders.length > 0 && folderList}
    </Root>
  );
});
