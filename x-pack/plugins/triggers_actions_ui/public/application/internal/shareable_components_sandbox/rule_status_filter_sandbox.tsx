/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { RuleStatusFilterProps } from '../../../types';
import { getRuleStatusFilterLazy } from '../../../common/get_rule_status_filter';

export const RuleStatusFilterSandbox = () => {
  const [selectedStatuses, setSelectedStatuses] = useState<
    RuleStatusFilterProps['selectedStatuses']
  >([]);

  return (
    <div style={{ flex: 1 }}>
      {getRuleStatusFilterLazy({
        selectedStatuses,
        onChange: setSelectedStatuses,
      })}
      <div>Selected states: {JSON.stringify(selectedStatuses)}</div>
    </div>
  );
};
