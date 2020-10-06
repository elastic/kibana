/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescribedFormGroup, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { useKibana } from '../../../../../shared_imports';
import { PhaseWithAllocationAction, PhaseWithAllocation } from '../../../../../../common/types';
import { PhaseValidationErrors } from '../../../../services/policies/policy_validation';
import { getAvailableNodeRoleForPhase } from '../../../../lib/data_tiers';
import { isNodeRoleFirstPreference } from '../../../../lib/data_tiers/is_node_role_first_preference';

import {
  DataTierAllocation,
  DefaultAllocationNotice,
  NoNodeAttributesWarning,
  NodesDataProvider,
  CloudDataTierCallout,
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
  const {
    services: { cloud },
  } = useKibana();
  return (
    <NodesDataProvider>
      {({ nodesByRoles, nodesByAttributes }) => {
        const hasNodeAttrs = Boolean(Object.keys(nodesByAttributes ?? {}).length);

        const renderDefaultAllocationNotice = () => {
          if (phaseData.dataTierAllocationType !== 'default') {
            return null;
          }

          const allocationNodeRole = getAvailableNodeRoleForPhase(phase, nodesByRoles);
          if (
            allocationNodeRole !== 'none' &&
            isNodeRoleFirstPreference(phase, allocationNodeRole)
          ) {
            return null;
          }

          return (
            <>
              <EuiSpacer size="s" />
              <DefaultAllocationNotice phase={phase} targetNodeRole={allocationNodeRole} />
            </>
          );
        };

        const renderNodeAttributesWarning = () => {
          if (phaseData.dataTierAllocationType !== 'custom') {
            return null;
          }
          if (hasNodeAttrs) {
            return null;
          }
          return (
            <>
              <EuiSpacer size="s" />
              <NoNodeAttributesWarning phase={phase} />
            </>
          );
        };

        const renderCloudCallout = () => {
          const isCloudEnabled = cloud?.isCloudEnabled ?? false;
          if (
            phase !== 'cold' ||
            !isCloudEnabled ||
            phaseData.dataTierAllocationType !== 'default'
          ) {
            return null;
          }

          /**
           * Check whether there are any data_cold tier roles
           */
          if (nodesByRoles.data_cold?.length) {
            return null;
          }

          return (
            <>
              <EuiSpacer size="s" />
              <CloudDataTierCallout />
            </>
          );
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
                  nodes={nodesByAttributes}
                />

                {/* Data tier related warnings and call-to-action notices */}
                {renderDefaultAllocationNotice()}
                {renderNodeAttributesWarning()}
                {renderCloudCallout()}
              </>
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      }}
    </NodesDataProvider>
  );
};
