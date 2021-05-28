/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_EVENT_FILTERS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
  MANAGEMENT_ROUTING_TRUSTED_APPS_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { PolicyContainer } from './policy';
import { TrustedAppsContainer } from './trusted_apps';
import { getEndpointListPath } from '../common/routing';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { useIngestEnabledCheck } from '../../common/hooks/endpoint/ingest_enabled';
import { EventFiltersContainer } from './event_filters';

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
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.endpointManagement.noPermissionsSubText"
              defaultMessage="It looks like Fleet is disabled. Fleet must be enabled to use this feature. If you do not have permissions to enable Fleet, contact your Kibana administrator."
            />
          </EuiText>
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
      <Route path={MANAGEMENT_ROUTING_EVENT_FILTERS_PATH} component={EventFiltersContainer} />

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
