/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

export function SloListItems({ sloList }) {
  console.log('!!here');
  console.log(sloList, '!!list');
  sloList.map((slo) => console.log(slo, '!!slo'));

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      {sloList &&
        sloList.map((slo) => (
          <EuiFlexItem key={`${slo.id}-${slo.instanceId ?? 'ALL_VALUE'}`}>{slo.name}</EuiFlexItem>
        ))}
    </EuiFlexGroup>
  );
}
