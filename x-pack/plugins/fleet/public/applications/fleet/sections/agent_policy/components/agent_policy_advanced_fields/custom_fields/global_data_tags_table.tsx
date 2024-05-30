/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useState } from 'react';

import { EuiBasicTable, EuiBadge } from '@elastic/eui';

import type {
  NewAgentPolicy,
  AgentPolicy,
  GlobalDataTag,
} from '../../../../../../../../common/types';

interface Props {
  updateAgentPolicy: (u: Partial<NewAgentPolicy | AgentPolicy>) => void;
  initialTags: GlobalDataTag[];
}

export const GlobalDataTagsTable: React.FunctionComponent<Props> = ({
  updateAgentPolicy,
  initialTags,
}) => {
  const [globalDataTags, setGlobalDataTags] = useState<GlobalDataTag[]>(initialTags);
  const columns = [
    {
      field: 'name',
      name: 'Name',
      render: (name: string, item: GlobalDataTag) => {
        return <EuiBadge>{name}</EuiBadge>;
      },
    },
    {
      field: 'value',
      name: 'Value',
      render: (value: string | number, item: GlobalDataTag) => {
        return <EuiBadge>{value}</EuiBadge>;
      },
    },
  ];

  return (
    <>
      <EuiBasicTable
        items={globalDataTags}
        columns={columns}
        noItemsMessage="No global data tags available"
      />
    </>
  );
};
