/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FunctionComponent } from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';

import { ListNodesRouteResponse } from '../../../../../../common/types';

import { isPhaseDefaultDataAllocationCompatible } from '../../../../lib/data_tiers';
import { DataTierAllocationType } from '../../../../services/policies/types';

interface Props {
  phase: Parameters<typeof isPhaseDefaultDataAllocationCompatible>[0];
  nodesByRoles: ListNodesRouteResponse['nodesByRoles'];
  currentAllocationType: DataTierAllocationType;
}

const i18nTexts = {
  notAvailable: {
    title: i18n.translate(
      'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableTitle',
      { defaultMessage: 'No warm tier nodes found' }
    ),
    body: i18n.translate(
      'xpack.indexLifecycleMgmt.warmPhase.dataTier.defaultAllocationNotAvailableBody',
      {
        defaultMessage:
          'This policy will not complete allocation because no node was found for data allocation.',
      }
    ),
  },
};

export const DefaultAllocationWarning: FunctionComponent<Props> = ({
  phase,
  nodesByRoles,
  currentAllocationType,
}) => {
  const isCompatible = isPhaseDefaultDataAllocationCompatible(phase, nodesByRoles);
  return currentAllocationType === 'default' && !isCompatible ? (
    <>
      <EuiSpacer size="m" />
      <EuiCallOut title={i18nTexts.notAvailable.title} iconType="alert" color="warning">
        {i18nTexts.notAvailable.body}
      </EuiCallOut>
    </>
  ) : null;
};
