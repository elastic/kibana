/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

import { ExperimentalFeaturesService } from '../../../../../services';
import {
  generateCreatePackagePolicyDevToolsRequest,
  generateCreateAgentPolicyDevToolsRequest,
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
}: {
  withSysMonitoring: boolean;
  selectedPolicyTab: SelectedPolicyTab;
  newAgentPolicy: NewAgentPolicy;
  packagePolicy: NewPackagePolicy;
  packageInfo?: PackageInfo;
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
        )}\n\n${generateCreatePackagePolicyDevToolsRequest({
          ...packagePolicy,
        })}`,
        i18n.translate(
          'xpack.fleet.createPackagePolicy.devtoolsRequestWithAgentPolicyDescription',
          {
            defaultMessage:
              'These Kibana requests create a new agent policy and a new package policy.',
          }
        ),
      ];
    }

    return [
      generateCreatePackagePolicyDevToolsRequest({
        ...packagePolicy,
      }),
      i18n.translate('xpack.fleet.createPackagePolicy.devtoolsRequestDescription', {
        defaultMessage: 'This Kibana request creates a new package policy.',
      }),
    ];
  }, [packagePolicy, newAgentPolicy, withSysMonitoring, selectedPolicyTab]);

  return { showDevtoolsRequest, devtoolRequest, devtoolRequestDescription };
}
