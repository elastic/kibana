/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTitle } from '@elastic/eui';
import React from 'react';

export function InventoryGroupPanel({ field }: { field: string }) {
  return (
    <div data-test-subj={`inventory-group-panel-${field}`} className="inventoryGroupPanel">
      <EuiTitle size="xs">
        <h4>{field}</h4>
      </EuiTitle>
    </div>
  );
}
