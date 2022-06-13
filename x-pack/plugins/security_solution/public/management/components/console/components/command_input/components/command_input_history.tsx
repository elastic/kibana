/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';

export const CommandInputHistory = memo(() => {
  const inputHistory = useWithInputHistory();

  return (
    <div>
      {inputHistory.map(({ id, input }) => {
        return <div key={id}>{input}</div>;
      })}
    </div>
  );
});
CommandInputHistory.displayName = 'CommandInputHistory';
