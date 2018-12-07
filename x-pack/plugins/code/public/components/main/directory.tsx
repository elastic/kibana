/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Link, RouteComponentProps, withRouter } from 'react-router-dom';
import { FileTree, FileTreeItemType } from '../../../model';
import { MainRouteParams, PathTypes } from '../../common/types';

interface Props extends RouteComponentProps<MainRouteParams> {
  node?: FileTree;
}

export const Directory = withRouter((props: Props) => {
  const files = props.node ? props.node.children : null;
  const { resource, org, repo, revision } = props.match.params;
  const fileList =
    files &&
    files.map(file => {
      if (file.type === FileTreeItemType.File) {
        return (
          <div key={file.name} className="directoryItem">
            <Link to={`/${resource}/${org}/${repo}/${PathTypes.blob}/${revision}/${file.path}`}>
              {file.name}
            </Link>
          </div>
        );
      } else if (file.type === FileTreeItemType.Directory) {
        return (
          <div key={file.name} className="directoryItem">
            <Link to={`/${resource}/${org}/${repo}/${PathTypes.tree}/${revision}/${file.path}`}>
              {file.name}/
            </Link>
          </div>
        );
      } else {
        throw new Error(`invalid file tree item type ${file.type}`);
      }
    });
  return <div className="directoryView">{fileList}</div>;
});
