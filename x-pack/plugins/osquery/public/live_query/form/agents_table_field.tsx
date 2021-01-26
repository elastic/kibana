/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback } from 'react';
import { FieldHook } from '../../shared_imports';
import { AgentsTable } from '../../agents/agents_table';

interface AgentsTableFieldProps {
  field: FieldHook<string[]>;
}

const AgentsTableFieldComponent: React.FC<AgentsTableFieldProps> = ({ field }) => {
  const { value, setValue } = field;
  const handleChange = useCallback(
    (props) => {
      if (props !== value) {
        return setValue(props);
      }
    },
    [value, setValue]
  );

  return <AgentsTable selectedAgents={value} onChange={handleChange} />;
};

export const AgentsTableField = React.memo(AgentsTableFieldComponent);
