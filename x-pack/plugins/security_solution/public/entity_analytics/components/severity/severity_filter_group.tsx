/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiFilterGroup } from '@elastic/eui';
import type { SeverityFilterProps } from './severity_filter';
import { SeverityFilter } from './severity_filter';
export const SeverityFilterGroup: React.FC<SeverityFilterProps> = ({
  selectedItems,
  onSelect,
  riskEntity,
}) => {
  return (
    <EuiFilterGroup>
      <SeverityFilter selectedItems={selectedItems} onSelect={onSelect} riskEntity={riskEntity} />
    </EuiFilterGroup>
  );
};
