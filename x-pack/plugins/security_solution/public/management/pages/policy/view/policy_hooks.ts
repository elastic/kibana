/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import { useHistory } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { i18n } from '@kbn/i18n';
import { PolicyDetailsArtifactsPageLocation, PolicyDetailsState } from '../types';
import { State } from '../../../../common/store';
import {
  MANAGEMENT_STORE_GLOBAL_NAMESPACE,
  MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE,
} from '../../../common/constants';
import {
  getPolicyDetailsArtifactsListPath,
  getPolicyEventFiltersPath,
} from '../../../common/routing';
import {
  getCurrentArtifactsLocation,
  getUpdateArtifacts,
  getUpdateArtifactsLoaded,
  getUpdateArtifactsIsFailed,
  policyIdFromParams,
} from '../store/policy_details/selectors';
import { useToasts } from '../../../../common/lib/kibana';

/**
 * Narrows global state down to the PolicyDetailsState before calling the provided Policy Details Selector
 * @param selector
 */
export function usePolicyDetailsSelector<TSelected>(
  selector: (state: PolicyDetailsState) => TSelected
) {
  return useSelector((state: State) =>
    selector(
      state[MANAGEMENT_STORE_GLOBAL_NAMESPACE][
        MANAGEMENT_STORE_POLICY_DETAILS_NAMESPACE
      ] as PolicyDetailsState
    )
  );
}

export type NavigationCallback = (
  ...args: Parameters<Parameters<typeof useCallback>[0]>
) => Partial<PolicyDetailsArtifactsPageLocation>;

export function usePolicyDetailsNavigateCallback() {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const history = useHistory();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  return useCallback(
    (args: Partial<PolicyDetailsArtifactsPageLocation>) =>
      history.push(
        getPolicyDetailsArtifactsListPath(policyId, {
          ...location,
          ...args,
        })
      ),
    [history, location, policyId]
  );
}

export function usePolicyDetailsEventFiltersNavigateCallback() {
  const location = usePolicyDetailsSelector(getCurrentArtifactsLocation);
  const history = useHistory();
  const policyId = usePolicyDetailsSelector(policyIdFromParams);

  return useCallback(
    (args: Partial<PolicyDetailsArtifactsPageLocation>) =>
      history.push(
        getPolicyEventFiltersPath(policyId, {
          ...location,
          ...args,
        })
      ),
    [history, location, policyId]
  );
}

export const usePolicyTrustedAppsNotification = () => {
  const updateSuccessfull = usePolicyDetailsSelector(getUpdateArtifactsLoaded);
  const updateFailed = usePolicyDetailsSelector(getUpdateArtifactsIsFailed);
  const updatedArtifacts = usePolicyDetailsSelector(getUpdateArtifacts);
  const toasts = useToasts();
  const [wasAlreadyHandled] = useState(new WeakSet());

  if (updateSuccessfull && updatedArtifacts && !wasAlreadyHandled.has(updatedArtifacts)) {
    wasAlreadyHandled.add(updatedArtifacts);
    const updateCount = updatedArtifacts.length;

    toasts.addSuccess({
      title: i18n.translate(
        'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastSuccess.title',
        {
          defaultMessage: 'Success',
        }
      ),
      text:
        updateCount > 1
          ? i18n.translate(
              'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastSuccess.textMultiples',
              {
                defaultMessage: '{count} trusted applications have been added to your list.',
                values: { count: updateCount },
              }
            )
          : i18n.translate(
              'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastSuccess.textSingle',
              {
                defaultMessage: '"{name}" has been added to your trusted applications list.',
                values: { name: updatedArtifacts[0].data.name },
              }
            ),
    });
  } else if (updateFailed) {
    toasts.addDanger(
      i18n.translate(
        'xpack.securitySolution.endpoint.policy.trustedApps.layout.flyout.toastError.text',
        {
          defaultMessage: `An error occurred updating artifacts`,
        }
      )
    );
  }
};
