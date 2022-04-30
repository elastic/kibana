/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TableHead } from './table_head';
import { TableBody } from './table_body';

export const ClusterView = (props) => {
  return (
    <table cellPadding="0" cellSpacing="0" className="table">
      <TableHead
        labels={props.labels}
        toggleShowSystemIndices={props.toggleShowSystemIndices}
        showSystemIndices={props.showSystemIndices}
      />
      <TableBody
        filter={props.filter}
        totalCount={props.totalCount}
        rows={props.nodesByIndices}
        cols={props.labels.length}
        shardStats={props.shardStats}
      />
    </table>
  );
};
