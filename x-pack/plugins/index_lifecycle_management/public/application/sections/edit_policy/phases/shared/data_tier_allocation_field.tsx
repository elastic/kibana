/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescribedFormGroup, EuiFormRow } from '@elastic/eui';

import { PhaseWithAllocationAction, PhaseWithAllocation } from '../../../../../../common/types';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';
import { determineAllocationNodeRole } from '../../../../lib/data_tiers';
import { isNodeRoleFirstPreference } from '../../../../lib/data_tiers/is_node_role_first_preference';

import {
  DataTierAllocation,
  DefaultAllocationNotice,
  NoNodeAttributesWarning,
  NodesDataProvider,
} from '../../components/data_tier_allocation';

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
        const hasNodeAttrs = Boolean(Object.keys(nodesData.nodesByAttributes ?? {}).length);

        const renderDefaultAllocationNotice = () => {
          if (phaseData.dataTierAllocationType !== 'default') {
            return null;
          }
          const allocationNodeRole = determineAllocationNodeRole(phase, nodesData.nodesByRoles);
          if (
            allocationNodeRole === 'none' ||
            !isNodeRoleFirstPreference(phase, allocationNodeRole)
          ) {
            return <DefaultAllocationNotice phase={phase} targetNodeRole={allocationNodeRole} />;
          }
          return null;
        };

        const renderNodeAttributesWarning = () => {
          if (phaseData.dataTierAllocationType !== 'custom') {
            return null;
          }
          if (!hasNodeAttrs) {
            return <NoNodeAttributesWarning phase={phase} />;
          }
          return null;
        };

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
                {renderDefaultAllocationNotice()}
                {renderNodeAttributesWarning()}
              </>
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      }}
    </NodesDataProvider>
  );
};
