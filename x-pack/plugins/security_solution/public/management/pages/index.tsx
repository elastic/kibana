/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { memo } from 'react';
import { useHistory, Route, Switch } from 'react-router-dom';

import { EuiText, EuiEmptyPrompt } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { PolicyContainer } from './policy';
import {
  MANAGEMENT_ROUTING_ENDPOINTS_PATH,
  MANAGEMENT_ROUTING_POLICIES_PATH,
  MANAGEMENT_ROUTING_ROOT_PATH,
} from '../common/constants';
import { NotFoundPage } from '../../app/404';
import { EndpointsContainer } from './endpoint_hosts';
import { getEndpointListPath } from '../common/routing';
import { SpyRoute } from '../../common/utils/route/spy_routes';
import { SecurityPageName } from '../../app/types';

const NoPermissions = memo(() => {
  return (
    <>
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        titleSize="l"
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
                id="xpack.securitySolution.endpointManagemnet.noPermissionsSubText"
                defaultMessage="It looks like Ingest Manager is disabled. Ingest Manager must be enabled to use this feature. If you do not have permissions to enable Ingest Manager, contact your Kibana administrator."
              />
            </EuiText>
          </p>
        }
      />
      <SpyRoute pageName={SecurityPageName.management} />
    </>
  );
});
NoPermissions.displayName = 'NoPermissions';

export const ManagementContainer = memo(() => {
  const history = useHistory();
  return (
    <Switch>
      <Route
        path={MANAGEMENT_ROUTING_ENDPOINTS_PATH}
        component={true ? NoPermissions : EndpointsContainer}
      />
      <Route
        path={MANAGEMENT_ROUTING_POLICIES_PATH}
        component={true ? NoPermissions : PolicyContainer}
      />
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
