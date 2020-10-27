/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescribedFormGroup, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { useKibana } from '../../../../../../shared_imports';
import { PhaseWithAllocationAction, PhaseWithAllocation } from '../../../../../../../common/types';
import { PhaseValidationErrors } from '../../../../../services/policies/policy_validation';
import { getAvailableNodeRoleForPhase, isNodeRoleFirstPreference } from '../../../../../lib';

import {
  DataTierAllocation,
  DefaultAllocationNotice,
  NoNodeAttributesWarning,
  NodesDataProvider,
  CloudDataTierCallout,
} from '../../data_tier_allocation';

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
export const DataTierAllocationFieldLegacy: FunctionComponent<Props> = ({
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
      {({ nodesByRoles, nodesByAttributes, isUsingDeprecatedDataRoleConfig }) => {
        const hasDataNodeRoles = Object.keys(nodesByRoles).some((nodeRole) =>
          // match any of the "data_" roles, including data_content.
          nodeRole.trim().startsWith('data_')
        );
        const hasNodeAttrs = Boolean(Object.keys(nodesByAttributes ?? {}).length);

        const renderNotice = () => {
          switch (phaseData.dataTierAllocationType) {
            case 'default':
              const isCloudEnabled = cloud?.isCloudEnabled ?? false;
              if (isCloudEnabled && phase === 'cold') {
                const isUsingNodeRolesAllocation =
                  !isUsingDeprecatedDataRoleConfig && hasDataNodeRoles;
                const hasNoNodesWithNodeRole = !nodesByRoles.data_cold?.length;

                if (isUsingNodeRolesAllocation && hasNoNodesWithNodeRole) {
                  // Tell cloud users they can deploy nodes on cloud.
                  return (
                    <>
                      <EuiSpacer size="s" />
                      <CloudDataTierCallout />
                    </>
                  );
                }
              }

              const allocationNodeRole = getAvailableNodeRoleForPhase(phase, nodesByRoles);
              if (
                allocationNodeRole === 'none' ||
                !isNodeRoleFirstPreference(phase, allocationNodeRole)
              ) {
                return (
                  <>
                    <EuiSpacer size="s" />
                    <DefaultAllocationNotice phase={phase} targetNodeRole={allocationNodeRole} />
                  </>
                );
              }
              break;
            case 'custom':
              if (!hasNodeAttrs) {
                return (
                  <>
                    <EuiSpacer size="s" />
                    <NoNodeAttributesWarning phase={phase} />
                  </>
                );
              }
              break;
            default:
              return null;
          }
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
                  disableDataTierOption={Boolean(
                    cloud?.isCloudEnabled && !hasDataNodeRoles && isUsingDeprecatedDataRoleConfig
                  )}
                />

                {/* Data tier related warnings and call-to-action notices */}
                {renderNotice()}
              </>
            </EuiFormRow>
          </EuiDescribedFormGroup>
        );
      }}
    </NodesDataProvider>
  );
};
