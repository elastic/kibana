/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import React, { FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiDescribedFormGroup, EuiSpacer, EuiLoadingSpinner } from '@elastic/eui';

import { useKibana, useFormData } from '../../../../../../../shared_imports';

import { PhaseWithAllocation } from '../../../../../../../../common/types';

import { getAvailableNodeRoleForPhase, isNodeRoleFirstPreference } from '../../../../../../lib';

import { useLoadNodes } from '../../../../../../services/api';

import { DataTierAllocationType } from '../../../../types';

import {
  DataTierAllocation,
  DefaultAllocationNotice,
  DefaultAllocationWarning,
  NoNodeAttributesWarning,
  CloudDataTierCallout,
  LoadingError,
} from './components';

import './_data_tier_allocation.scss';

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
  const allocationType: DataTierAllocationType = get(formData, dataTierAllocationTypePath);

  const { data, resendRequest, error, isLoading } = useLoadNodes();

  const { nodesByRoles, nodesByAttributes, isUsingDeprecatedDataRoleConfig } = data!;

  const hasNodeAttrs = Boolean(Object.keys(nodesByAttributes ?? {}).length);
  const isCloudEnabled = cloud?.isCloudEnabled ?? false;
  const cloudDeploymentUrl = cloud?.cloudDeploymentUrl;

  const renderNotice = () => {
    switch (allocationType) {
      case 'node_roles':
        /**
         * On cloud most users should be using autoscaling which will provision tiers as they are needed. We do not surface any
         * of the notices below.
         */
        if (isCloudEnabled) {
          return null;
        }
        /**
         * Node role allocation moves data in a phase to a corresponding tier of the same name. To prevent policy execution from getting
         * stuck ILM allocation will fall back to a previous tier if possible. We show the WARNING below to inform a user when even
         * this fallback will not succeed.
         */
        const allocationNodeRole = getAvailableNodeRoleForPhase(phase, nodesByRoles);
        if (allocationNodeRole === 'none') {
          return (
            <>
              <EuiSpacer size="s" />
              <DefaultAllocationWarning phase={phase} />
            </>
          );
        }

        /**
         * If we are able to fallback to a data tier that does not map to this phase, we show a notice informing the user that their
         * data will not be assigned to a corresponding tier.
         */
        if (!isNodeRoleFirstPreference(phase, allocationNodeRole)) {
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
        /**
         * Special cloud case: when deprecated data role configuration is in use, it means that this deployment is not using
         * the new node role based allocation. We drive users to the cloud console to migrate to node role based allocation
         * in that case.
         */
        if (isCloudEnabled && isUsingDeprecatedDataRoleConfig) {
          return (
            <>
              <EuiSpacer size="s" />
              <CloudDataTierCallout linkToCloudDeployment={cloudDeploymentUrl} />
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
      description={
        <>
          {description}
          {isLoading ? (
            <>
              <EuiSpacer size="m" />
              <EuiLoadingSpinner size="xl" />
            </>
          ) : (
            error && (
              <LoadingError
                onResendRequest={resendRequest}
                message={error.message}
                statusCode={error.statusCode}
              />
            )
          )}
        </>
      }
      fullWidth
    >
      <div className="ilmDataTierAllocationField">
        <DataTierAllocation
          hasNodeAttributes={hasNodeAttrs}
          phase={phase}
          nodes={nodesByAttributes}
          disableDataTierOption={Boolean(isCloudEnabled && isUsingDeprecatedDataRoleConfig)}
          isLoading={isLoading}
        />

        {/* Data tier related warnings and call-to-action notices */}
        {!isLoading && renderNotice()}
      </div>
    </EuiDescribedFormGroup>
  );
};
