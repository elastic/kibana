/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon, IconType } from '@elastic/eui';
import { euiColorHighlight } from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { FileTree, FileTreeItemType } from '../../../model';
import { MainRouteParams, PathTypes } from '../../common/types';

const Root = styled.div`
  padding: 16px;
`;

const DirectoryNodesContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const NodeName = styled.span`
  margin-left: 5px;
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

const Title = styled.div`
  color: #1a1a1a;
  font-size: 20px;
  font-weight: 600;
  margin: 4px 0 18px;
`;

const Container = styled.div`
  &:not(:first-child) {
    margin-top: 20px;
  }
`;

const DirectoryNode = styled.div`
  width: 20%;
  margin: 0 8px 10px;
  :hover {
    background-color: ${euiColorHighlight};
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
  };
  const nodes = props.nodes.map(n => (
    <DirectoryNode key={n.path}>
      <EuiIcon type={typeIconMap[props.type]} />
      <NodeName>
        <Link to={props.getUrl(n.path!)}>{n.name}</Link>
      </NodeName>
    </DirectoryNode>
  ));
  return (
    <Container>
      <Title>{props.title}</Title>
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
    files = props.node.children.filter(n => n.type === FileTreeItemType.File);
    folders = props.node.children.filter(n => n.type === FileTreeItemType.Directory);
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
      {fileList}
      {folderList}
    </Root>
  );
});
