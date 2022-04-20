/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { RuleStateFilterProps } from '../../../types';
import { getRuleStateFilterLazy } from '../../../common/get_rule_state_filter';

export const RuleStateFilterSandbox = () => {
  const [selectedStates, setSelectedStates] = useState<RuleStateFilterProps['selectedStates']>([]);

  return (
    <div style={{ flex: 1 }}>
      {getRuleStateFilterLazy({
        selectedStates,
        onChange: setSelectedStates,
      })}
      <div>Selected states: {JSON.stringify(selectedStates)}</div>
    </div>
  );
};
