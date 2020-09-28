/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { PhaseWithAllocationAction, PhaseWithAllocation } from '../../../../../../common/types';

import {
  DataTierAllocation,
  DefaultAllocationWarning,
  NoNodeAttributesWarning,
  NodesDataProvider,
} from '../../components/data_tier_allocation';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';
import { isPhaseDefaultDataAllocationCompatible } from '../../../../lib/data_tiers';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.common.dataTier.title', {
    defaultMessage: 'Data allocation',
  }),
};

interface Props {
  description: React.ReactNode;
  phase: PhaseWithAllocation;
  setPhaseData: (dataKey: keyof PhaseWithAllocationAction, value: string) => void;
  isShowingErrors: boolean;
  errors?: PhaseValidationErrors<PhaseWithAllocationAction>;
  phaseData: PhaseWithAllocationAction;
}

/**
 * Top-level layout control for the data tier allocation field.
 */
export const DataTierAllocationField: FunctionComponent<Props> = ({
  description,
  phase,
  phaseData,
  setPhaseData,
  isShowingErrors,
  errors,
}) => {
  return (
    <NodesDataProvider>
      {(nodesData) => {
        const isCompatible = isPhaseDefaultDataAllocationCompatible(phase, nodesData.nodesByRoles);
        const hasNodeAttrs = Boolean(Object.keys(nodesData.nodesByAttributes ?? {}).length);

        return (
          <EuiDescribedFormGroup
            title={<h3>{i18nTexts.title}</h3>}
            description={description}
            fullWidth
          >
            <EuiFormRow>
              <>
                <DataTierAllocation
                  hasNodeAttributes={hasNodeAttrs}
                  phase={phase}
                  errors={errors}
                  setPhaseData={setPhaseData}
                  phaseData={phaseData}
                  isShowingErrors={isShowingErrors}
                  nodes={nodesData.nodesByAttributes}
                />

                {/* Data tier related warnings */}

                {phaseData.dataTierAllocationType === 'default' && !isCompatible && (
                  <DefaultAllocationWarning phase={phase} />
                )}

                {phaseData.dataTierAllocationType === 'custom' && !hasNodeAttrs && (
                  <NoNodeAttributesWarning phase={phase} />
                )}
              </>
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      }}
    </NodesDataProvider>
  );
};
