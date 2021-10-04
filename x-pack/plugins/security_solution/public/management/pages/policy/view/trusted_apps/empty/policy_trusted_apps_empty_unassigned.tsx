/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiPageTemplate, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useNavigateToAppEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';
import { getPolicyTrustedAppsPath, getTrustedAppsListPath } from '../../../../../common/routing';
import { APP_ID } from '../../../../../../../common/constants';
import { usePolicyDetailsNavigateCallback } from '../../policy_hooks';

interface CommonProps {
  policyId: string;
  policyName: string;
}

export const PolicyTrustedAppsEmptyUnassigned = memo<CommonProps>(({ policyId, policyName }) => {
  const navigateCallback = usePolicyDetailsNavigateCallback();
  const { getAppUrl } = useAppUrl();
  const { toRoutePath, toRouteUrl } = useMemo(() => {
    const path = getTrustedAppsListPath();
    return {
      toRoutePath: path,
      toRouteUrl: getAppUrl({ path }),
    };
  }, [getAppUrl]);

  const policyTrustedAppsPath = useMemo(() => getPolicyTrustedAppsPath(policyId), [policyId]);
  const policyTrustedAppRouteState = useMemo(() => {
    return {
      backButtonLabel: i18n.translate(
        'xpack.securitySolution.endpoint.fleetCustomExtension.artifacts.backButtonLabel',
        {
          defaultMessage: `Back to ${policyName} policy`,
        }
      ),
      onBackButtonNavigateTo: [
        APP_ID,
        {
          path: policyTrustedAppsPath,
        },
      ],
      backButtonUrl: getAppUrl({
        appId: APP_ID,
        path: policyTrustedAppsPath,
      }),
    };
  }, [getAppUrl, policyName, policyTrustedAppsPath]);

  const onClickHandler = useNavigateToAppEventHandler(APP_ID, {
    state: policyTrustedAppRouteState,
    path: toRoutePath,
  });
  return (
    <EuiPageTemplate template="centeredContent">
      <EuiEmptyPrompt
        iconType="faceHappy"
        data-test-subj="policy-trusted-apps-empty-unassigned"
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.title"
              defaultMessage="No assigned trusted applications"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.content"
            defaultMessage="There are currently no trusted applications assigned to {policyName}. Assign trusted applications now or add and manage them on the trusted applications page."
            values={{ policyName }}
          />
        }
        actions={[
          <EuiButton
            color="primary"
            fill
            onClick={() =>
              navigateCallback({
                show: 'list',
              })
            }
          >
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.primaryAction"
              defaultMessage="Assign trusted applications"
            />
          </EuiButton>,
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiLink onClick={onClickHandler} href={toRouteUrl}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unassigned.secondaryAction"
              defaultMessage="Manage trusted applications"
            />
          </EuiLink>,
        ]}
      />
    </EuiPageTemplate>
  );
});

PolicyTrustedAppsEmptyUnassigned.displayName = 'PolicyTrustedAppsEmptyUnassigned';
