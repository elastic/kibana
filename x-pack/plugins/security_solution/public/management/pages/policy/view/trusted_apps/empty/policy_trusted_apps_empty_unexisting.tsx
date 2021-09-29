/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useMemo } from 'react';
import { EuiEmptyPrompt, EuiButton, EuiPageTemplate } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { useNavigateToAppEventHandler } from '../../../../../../common/hooks/endpoint/use_navigate_to_app_event_handler';
import { useAppUrl } from '../../../../../../common/lib/kibana/hooks';
import { getPolicyTrustedAppsPath, getTrustedAppsListPath } from '../../../../../common/routing';
import { APP_ID } from '../../../../../../../common/constants';

interface CommonProps {
  policyId: string;
  policyName: string;
}

export const PolicyTrustedAppsEmptyUnexisting = memo<CommonProps>(({ policyId, policyName }) => {
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
        title={
          <h2>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.title"
              defaultMessage="No trusted applications exist"
            />
          </h2>
        }
        body={
          <FormattedMessage
            id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.content"
            defaultMessage="There are currently no trusted applications applied to your endpoints."
          />
        }
        actions={
          // eslint-disable-next-line @elastic/eui/href-or-on-click
          <EuiButton color="primary" fill onClick={onClickHandler} href={toRouteUrl}>
            <FormattedMessage
              id="xpack.securitySolution.endpoint.policy.trustedApps.empty.unexisting.action"
              defaultMessage="Add trusted application"
            />
          </EuiButton>
        }
      />
    </EuiPageTemplate>
  );
});

PolicyTrustedAppsEmptyUnexisting.displayName = 'PolicyTrustedAppsEmptyUnexisting';
