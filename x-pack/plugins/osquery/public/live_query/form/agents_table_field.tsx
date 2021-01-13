/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
// import { AgentListPage } from '../../../../fleet/public';
import { AgentsTable } from '../../agents/agents_table';

const AgentsTableFieldComponent = (payload) => {
  console.error('AgentsTableFieldComponent', payload);

  const handleChange = useCallback(
    (props) => {
      console.error('handleChange', payload, props);

      if (props !== payload.field.value) {
        // payload.field.setValue
        return payload.field.setValue(props);
      }
    },
    [payload]
  );

  return <AgentsTable selectedAgents={payload.field.value} onChange={handleChange} />;
};

export const AgentsTableField = React.memo(AgentsTableFieldComponent);
