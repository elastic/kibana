/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { EuiDescribedFormGroup, EuiFormRow, EuiSpacer } from '@elastic/eui';

import { useKibana, useFormData } from '../../../../../../../shared_imports';

import { PhaseWithAllocation } from '../../../../../../../../common/types';

import { getAvailableNodeRoleForPhase } from '../../../../../../lib/data_tiers';

import { isNodeRoleFirstPreference } from '../../../../../../lib';

import {
  DataTierAllocation,
  DefaultAllocationNotice,
  NoNodeAttributesWarning,
  NodesDataProvider,
  CloudDataTierCallout,
} from './components';

const i18nTexts = {
  title: i18n.translate('xpack.indexLifecycleMgmt.common.dataTier.title', {
    defaultMessage: 'Data allocation',
  }),
};

interface Props {
  phase: PhaseWithAllocation;
  description: React.ReactNode;
}

/**
 * Top-level layout control for the data tier allocation field.
 */
export const DataTierAllocationField: FunctionComponent<Props> = ({ phase, description }) => {
  const {
    services: { cloud },
  } = useKibana();

  const dataTierAllocationTypePath = `_meta.${phase}.dataTierAllocationType`;
  const [formData] = useFormData({ watch: dataTierAllocationTypePath });
  const allocationType = get(formData, dataTierAllocationTypePath);

  return (
    <NodesDataProvider>
      {({ nodesByRoles, nodesByAttributes, isUsingDeprecatedDataRoleConfig }) => {
        const hasNodeAttrs = Boolean(Object.keys(nodesByAttributes ?? {}).length);

        const renderNotice = () => {
          switch (allocationType) {
            case 'node_roles':
              const isCloudEnabled = cloud?.isCloudEnabled ?? false;
              const isUsingNodeRoles = !isUsingDeprecatedDataRoleConfig;
              if (
                isCloudEnabled &&
                isUsingNodeRoles &&
                phase === 'cold' &&
                !nodesByRoles.data_cold?.length
              ) {
                // Tell cloud users they can deploy cold tier nodes.
                return (
                  <>
                    <EuiSpacer size="s" />
                    <CloudDataTierCallout />
                  </>
                );
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
            case 'node_attrs':
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
                  nodes={nodesByAttributes}
                  disableDataTierOption={
                    !!(isUsingDeprecatedDataRoleConfig && cloud?.isCloudEnabled)
                  }
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
