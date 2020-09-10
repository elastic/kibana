/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { PhaseWithAllocationAction, PhaseWithAllocation } from '../../../../../../common/types';

import {
  DataTierAllocation,
  DefaultAllocationWarning,
  NodesDataProvider,
} from '../../components/data_tier_allocation';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';

interface Props {
  description: React.ReactNode;
  phase: PhaseWithAllocation;
  setPhaseData: (dataKey: keyof PhaseWithAllocationAction, value: string) => void;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<PhaseWithAllocationAction>;
  phaseData: PhaseWithAllocationAction;
  defaultAllocationWarningTitle: string;
  defaultAllocationWarningBody: string;
}

export const DataTierAllocationField: FunctionComponent<Props> = ({
  description,
  phaseData,
  setPhaseData,
  phase,
  isShowingErrors,
  errors,
  defaultAllocationWarningBody,
  defaultAllocationWarningTitle,
}) => {
  return (
    <NodesDataProvider>
      {(nodesData) => (
        <EuiDescribedFormGroup
          title={
            <h3>
              {i18n.translate(
                'xpack.indexLifecycleMgmt.editPolicy.coldPhase.dataTierAllocationTitle',
                { defaultMessage: 'Data tier allocation' }
              )}
            </h3>
          }
          description={description}
          fullWidth
        >
          <EuiFormRow>
            <>
              <DataTierAllocation
                phase={phase}
                errors={errors}
                setPhaseData={setPhaseData}
                phaseData={phaseData}
                isShowingErrors={isShowingErrors}
                nodes={nodesData.nodesByAttributes}
              />
              <DefaultAllocationWarning
                phase={phase}
                title={defaultAllocationWarningTitle}
                body={defaultAllocationWarningBody}
                nodesByRoles={nodesData.nodesByRoles}
                currentAllocationType={phaseData.dataTierAllocationType}
              />
            </>
          </EuiFormRow>
        </EuiDescribedFormGroup>
      )}
    </NodesDataProvider>
  );
};
