/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import {
  EuiButtonGroup,
  EuiButtonGroupOption,
  EuiSpacer,
  EuiCode,
  EuiText,
  EuiPanel,
} from '@elastic/eui';

import './data_tier_allocation.scss';
import { NodeAllocation } from './node_allocation';

// TODO: Fix this
type Props = any;

type AllocationId = 'node-role' | 'custom-allocation' | 'default';

interface ButtonOption extends EuiButtonGroupOption {
  id: AllocationId;
}

const buttonOptions: ButtonOption[] = [
  { id: 'node-role', label: 'Node role' },
  { id: 'custom-allocation', label: 'Custom' },
  { id: 'default', label: 'Default' },
];

export const DataTierAllocation: FunctionComponent<Props> = (props) => {
  const [selectedAllocationId, setSelectedAllocationId] = useState<AllocationId>('node-role');

  const contentMap: Record<AllocationId, React.ReactNode> = {
    'node-role': (
      <EuiText
        className="indexLifecycleManagement__dataTierAllocation__contentBox__descriptionPanel"
        size="s"
      >
        <p>
          Allocate shards to nodes with the <EuiCode>data_warm</EuiCode> role.
        </p>
      </EuiText>
    ),
    'custom-allocation': (
      <div className="indexLifecycleManagement__dataTierAllocation__contentBox__customAllocationPanel">
        <NodeAllocation {...props} />
      </div>
    ),
    default: (
      <EuiText
        className="indexLifecycleManagement__dataTierAllocation__contentBox__descriptionPanel"
        size="s"
      >
        <p>Shards in this phase will be allocated on all data nodes.</p>
      </EuiText>
    ),
  };

  return (
    <div role="region">
      <EuiText style={{ paddingBottom: '4px' }} size="xs">
        <b>Data tier allocation</b>
      </EuiText>
      <EuiButtonGroup
        className="indexLifecycleManagement__dataTierAllocation__buttonGroup"
        color="primary"
        idSelected={selectedAllocationId}
        options={buttonOptions}
        onChange={(id) => setSelectedAllocationId(id as AllocationId)}
        isFullWidth
      />
      {contentMap[selectedAllocationId]}
    </div>
  );
};
