/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { NodeItemWithStats } from './nodes_list';

interface ExpandedRowProps {
  item: NodeItemWithStats;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ item }) => {
  return (
    <>
      <EuiSpacer size={'m'} />
    </>
  );
};
