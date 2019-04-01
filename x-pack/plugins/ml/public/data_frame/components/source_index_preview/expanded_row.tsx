/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { EuiDescriptionList } from '@elastic/eui';

import { EsDoc } from './common';

interface ExpandedRowProps {
  item: EsDoc;
}

export const ExpandedRow: React.SFC<ExpandedRowProps> = ({ item }) => {
  const keys = Object.keys(item._source);
  const list = keys.map(k => {
    const description = item._source[k] !== null ? item._source[k] : '';
    return { title: k, description };
  });
  return <EuiDescriptionList compressed type="column" listItems={list} />;
};
