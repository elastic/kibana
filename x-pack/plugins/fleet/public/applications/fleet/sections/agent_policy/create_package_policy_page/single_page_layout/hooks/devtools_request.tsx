/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { omit } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

import { ExperimentalFeaturesService } from '../../../../../services';
import {
  generateCreatePackagePolicyDevToolsRequest,
  generateCreateAgentPolicyDevToolsRequest,
  generateUpdatePackagePolicyDevToolsRequest,
} from '../../../services';
import {
  FLEET_SYSTEM_PACKAGE,
  HIDDEN_API_REFERENCE_PACKAGES,
} from '../../../../../../../../common/constants';
import type { PackageInfo, NewAgentPolicy, NewPackagePolicy } from '../../../../../types';
import { SelectedPolicyTab } from '../../components';

export function useDevToolsRequest({
  newAgentPolicy,
  packagePolicy,
  packageInfo,
  selectedPolicyTab,
  withSysMonitoring,
  packagePolicyId,
}: {
  withSysMonitoring: boolean;
  selectedPolicyTab: SelectedPolicyTab;
  newAgentPolicy: NewAgentPolicy;
  packagePolicy: NewPackagePolicy;
  packageInfo?: PackageInfo;
  packagePolicyId?: string;
}) {
  const { showDevtoolsRequest: isShowDevtoolRequestExperimentEnabled } =
    ExperimentalFeaturesService.get();

  const showDevtoolsRequest =
    !HIDDEN_API_REFERENCE_PACKAGES.includes(packageInfo?.name ?? '') &&
    isShowDevtoolRequestExperimentEnabled;

  const [devtoolRequest, devtoolRequestDescription] = useMemo(() => {
    if (selectedPolicyTab === SelectedPolicyTab.NEW) {
      const packagePolicyIsSystem = packagePolicy?.package?.name === FLEET_SYSTEM_PACKAGE;
      return [
        `${generateCreateAgentPolicyDevToolsRequest(
          newAgentPolicy,
          withSysMonitoring && !packagePolicyIsSystem
        )}\n\n${
          packagePolicyId
            ? generateUpdatePackagePolicyDevToolsRequest(
                packagePolicyId,
                set(omit(packagePolicy, 'elasticsearch', 'policy_id'), 'policy_ids', [
                  ...packagePolicy.policy_ids,
                  '',
                ])
              )
            : generateCreatePackagePolicyDevToolsRequest({
                ...{ ...packagePolicy, policy_ids: [''] },
              })
        }`,
        packagePolicyId
          ? i18n.translate(
              'xpack.fleet.editPackagePolicy.devtoolsRequestWithAgentPolicyDescription',
              {
                defaultMessage:
                  'These Kibana requests create a new agent policy and update a package policy.',
              }
            )
          : i18n.translate(
              'xpack.fleet.createPackagePolicy.devtoolsRequestWithAgentPolicyDescription',
              {
                defaultMessage:
                  'These Kibana requests create a new agent policy and a new package policy.',
              }
            ),
      ];
    }

    return [
      packagePolicyId
        ? generateUpdatePackagePolicyDevToolsRequest(
            packagePolicyId,
            omit(packagePolicy, 'elasticsearch', 'policy_id')
          )
        : generateCreatePackagePolicyDevToolsRequest({
            ...packagePolicy,
          }),
      packagePolicyId
        ? i18n.translate('xpack.fleet.editPackagePolicy.devtoolsRequestDescription', {
            defaultMessage: 'This Kibana request updates package policy.',
          })
        : i18n.translate('xpack.fleet.createPackagePolicy.devtoolsRequestDescription', {
            defaultMessage: 'This Kibana request creates a new package policy.',
          }),
    ];
  }, [packagePolicy, newAgentPolicy, withSysMonitoring, selectedPolicyTab, packagePolicyId]);

  return { showDevtoolsRequest, devtoolRequest, devtoolRequestDescription };
}
