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
import { COLORS } from '@elastic/eui/src/components/icon/icon';

const Root = styled.div`
  padding: ${theme.paddingSizes.m};
`;

const DirectoryNodesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const NodeName = styled.span`
  margin-left: ${theme.euiSizeXs};
  vertical-align: middle;
  a {
    :focus: {
      border: none;
      outline: none;
    }
    :hover {
      border: none;
      outline: none;
    }
  }
`;

const Title = styled(EuiTitle)`
  margin: ${theme.euiSizeXs} 0 ${theme.euiSize};
`;

const Container = styled.div`
  &:not(:first-child) {
    margin-top: calc(20rem / 14);
  }
`;

const DirectoryNode = styled.div`
  width: calc(200rem / 14);
  margin: 0 ${theme.euiSizeS} ${theme.euiSizeM};
  :hover {
    background-color: ${theme.euiColorHighlight};
    cursor: pointer;
  }
`;

interface DirectoryNodesProps {
  title: string;
  nodes: FileTree[];
  type: FileTreeItemType;
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
    <div className="code-directory__node" key={n.path}>
      <Link to={props.getUrl(n.path!)} data-test-subj={`codeFileExplorerNode-${n.name}`}>
        <EuiIcon type={typeIconMap[n.type]} color="subdued" />
        <NodeName>{n.name}</NodeName>
      </Link>
    </div>
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
    `/${resource}/${org}/${repo}/${pathType}/${revision}/${path}`;
  const fileList = (
    <DirectoryNodes
      nodes={files}
      title="Files"
      type={FileTreeItemType.File}
      getUrl={getUrl(PathTypes.blob)}
    />
  );
  const folderList = (
    <DirectoryNodes
      nodes={folders}
      title="Directories"
      type={FileTreeItemType.Directory}
      getUrl={getUrl(PathTypes.tree)}
    />
  );
  return (
    <Root>
      {files.length > 0 && fileList}
      {folders.length > 0 && folderList}
    </Root>
  );
});
