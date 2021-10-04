/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TableHeadReact } from './table_head_react';
import { TableBody } from './table_body';
import { labels } from '../lib/labels';

export const ClusterViewReact = (props) => {
  return (
    <table cellPadding="0" cellSpacing="0" className="table">
      <TableHeadReact
        labels={labels.node}
        toggleShowSystemIndices={props.toggleShowSystemIndices}
        showSystemIndices={props.showSystemIndices}
      />
      <TableBody
        filter={props.filter}
        totalCount={props.totalCount}
        rows={props.nodesByIndices}
        cols={labels.node.length}
        shardStats={props.shardStats}
      />
    </table>
  );
};
