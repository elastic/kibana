/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { ListNodesRouteResponse, DataTierAllocationType } from '../../../../../../common/types';

import { isPhaseDefaultDataAllocationCompatible } from '../../../../lib/data_tiers';

interface Props {
  title: string;
  body: string;
  phase: Parameters<typeof isPhaseDefaultDataAllocationCompatible>[0];
  nodesByRoles: ListNodesRouteResponse['nodesByRoles'];
  currentAllocationType: DataTierAllocationType;
}

export const DefaultAllocationWarning: FunctionComponent<Props> = ({
  title,
  phase,
  body,
  nodesByRoles,
  currentAllocationType,
}) => {
  const isCompatible = isPhaseDefaultDataAllocationCompatible(phase, nodesByRoles);
  return currentAllocationType === 'default' && isCompatible ? (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut
        data-test-subj="defaultAllocationWarning"
        title={title}
        iconType="alert"
        color="warning"
      >
        {body}
      </EuiCallOut>
    </>
  ) : null;
};
