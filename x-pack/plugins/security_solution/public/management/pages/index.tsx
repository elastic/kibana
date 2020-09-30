/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash/fp';
import React, { memo } from 'react';
import { useHistory, Route, Switch } from 'react-router-dom';

import { ChromeBreadcrumb } from 'kibana/public';
import { EuiText, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { PolicyContainer } from './policy';
import { TrustedAppsContainer } from './trusted_apps';
import { getEndpointListPath } from '../common/routing';
import { APP_ID, SecurityPageName } from '../../../common/constants';
import { GetUrlForApp } from '../../common/components/navigation/types';
import { AdministrationRouteSpyState } from '../../common/utils/route/types';
import { ADMINISTRATION } from '../../app/home/translations';
import { AdministrationSubTab } from '../types';
import { ENDPOINTS_TAB, POLICIES_TAB, TRUSTED_APPS_TAB } from '../common/translations';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useIngestEnabledCheck } from '../../common/hooks/endpoint/ingest_enabled';

const TabNameMappedToI18nKey: Record<AdministrationSubTab, string> = {
  [AdministrationSubTab.endpoints]: ENDPOINTS_TAB,
  [AdministrationSubTab.policies]: POLICIES_TAB,
  [AdministrationSubTab.trustedApps]: TRUSTED_APPS_TAB,
};

export function getBreadcrumbs(
  params: AdministrationRouteSpyState,
  search: string[],
  getUrlForApp: GetUrlForApp
): ChromeBreadcrumb[] {
  return [
    {
      text: ADMINISTRATION,
      href: getUrlForApp(`${APP_ID}:${SecurityPageName.administration}`, {
        path: !isEmpty(search[0]) ? search[0] : '',
      }),
    },
    ...(params?.tabName ? [params?.tabName] : []).map((tabName) => ({
      text: TabNameMappedToI18nKey[tabName],
      href: '',
    })),
  ];
}

const NoPermissions = memo(() => {
  return (
    <>
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        titleSize="l"
        data-test-subj="noIngestPermissions"
        title={
          <FormattedMessage
            id="xpack.securitySolution.endpointManagemnet.noPermissionsText"
            defaultMessage="You do not have the required Kibana permissions to use Elastic Security Administration"
          />
        }
        body={
          <p>
            <EuiText color="subdued">
              <FormattedMessage
                id="xpack.securitySolution.endpointManagement.noPermissionsSubText"
                defaultMessage="It looks like Ingest Manager is disabled. Ingest Manager must be enabled to use this feature. If you do not have permissions to enable Ingest Manager, contact your Kibana administrator."
              />
            </EuiText>
          </p>
        }
      />
      <SpyRoute pageName={SecurityPageName.administration} />
    </>
  );
});
NoPermissions.displayName = 'NoPermissions';

export const ManagementContainer = memo(() => {
  const history = useHistory();
  const { allEnabled: isIngestEnabled } = useIngestEnabledCheck();

  if (!isIngestEnabled) {
    return <Route path="*" component={NoPermissions} />;
  }

  return (
    <Switch>
      <Route path={MANAGEMENT_ROUTING_ENDPOINTS_PATH} component={EndpointsContainer} />
      <Route path={MANAGEMENT_ROUTING_POLICIES_PATH} component={PolicyContainer} />
      <Route path={MANAGEMENT_ROUTING_TRUSTED_APPS_PATH} component={TrustedAppsContainer} />
      <Route
        path={MANAGEMENT_ROUTING_ROOT_PATH}
        exact
        render={() => {
          history.replace(getEndpointListPath({ name: 'endpointList' }));
          return null;
        }}
      />
      <Route path="*" component={NotFoundPage} />
    </Switch>
  );
});

ManagementContainer.displayName = 'ManagementContainer';
