/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiSwitch, EuiSpacer } from '@elastic/eui';

import { NodeAllocation } from './node_allocation';
import { DataTiers } from './data_tiers';

type Props = any;

export const DataAllocation: FunctionComponent<Props> = (props) => {
  const [showDataTiers, setShowDataTiers] = useState(true);

  return (
    <>
      <EuiSwitch
        label="Use ILM data tier allocation"
        checked={showDataTiers}
        onChange={() => setShowDataTiers((v) => !v)}
      />
      <EuiSpacer size="m" />
      {showDataTiers ? <DataTiers /> : <NodeAllocation {...props} />}
    </>
  );
};
