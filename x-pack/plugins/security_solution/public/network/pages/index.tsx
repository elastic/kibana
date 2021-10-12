/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';

import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';

import { NetworkDetails } from './details';
import { Network } from './network';
import { getNetworkRoutePath } from './navigation';
import { NetworkRouteType } from './navigation/types';
import { MlNetworkConditionalContainer } from '../../common/components/ml/conditional_links/ml_network_conditional_container';
import { FlowTarget } from '../../../common/search_strategy';
import { NETWORK_PATH } from '../../../common/constants';

const ipDetailsPageBasePath = `${NETWORK_PATH}/ip/:detailName`;

const NetworkContainerComponent = () => {
  const capabilities = useMlCapabilities();
  const capabilitiesFetched = capabilities.capabilitiesFetched;
  const userHasMlUserPermissions = useMemo(
    () => hasMlUserPermissions(capabilities),
    [capabilities]
  );
  const networkRoutePath = useMemo(
    () => getNetworkRoutePath(capabilitiesFetched, userHasMlUserPermissions),
    [capabilitiesFetched, userHasMlUserPermissions]
  );

  return (
    <Switch>
      <Route
        exact
        strict
        path={NETWORK_PATH}
        render={({ location: { search = '' } }) => (
          <Redirect to={{ pathname: `${NETWORK_PATH}/${NetworkRouteType.flows}`, search }} />
        )}
      />
      <Route path={`${NETWORK_PATH}/ml-network`}>
        <MlNetworkConditionalContainer />
      </Route>
      <Route strict path={networkRoutePath}>
        <Network
          capabilitiesFetched={capabilities.capabilitiesFetched}
          hasMlUserPermissions={userHasMlUserPermissions}
        />
      </Route>
      <Route path={`${ipDetailsPageBasePath}/:flowTarget`}>
        <NetworkDetails />
      </Route>
      <Route
        path={ipDetailsPageBasePath}
        render={({
          location: { search = '' },
          match: {
            params: { detailName },
          },
        }) => (
          <Redirect
            to={{
              pathname: `${NETWORK_PATH}/ip/${detailName}/${FlowTarget.source}`,
              search,
            }}
          />
        )}
      />
    </Switch>
  );
};

export const NetworkContainer = React.memo(NetworkContainerComponent);
