/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useCallback, useMemo } from 'react';
import { Route, Switch, useHistory } from 'react-router-dom';

import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';
import { FlowTarget } from '../../graphql/types';

import { NetworkDetails } from './details';
import { Network } from './network';
import { getNetworkRoutePath } from './navigation';
import { NetworkRouteType } from './navigation/types';
import { MlNetworkConditionalContainer } from '../../common/components/ml/conditional_links/ml_network_conditional_container';

const networkPagePath = '';
const networkDetailsPageBasePath = `/ip/:detailName`;

const NetworkContainerComponent: React.FC = () => {
  const history = useHistory();
  const capabilities = useMlCapabilities();
  const capabilitiesFetched = capabilities.capabilitiesFetched;
  const userHasMlUserPermissions = useMemo(() => hasMlUserPermissions(capabilities), [
    capabilities,
  ]);
  const networkRoutePath = useMemo(
    () => getNetworkRoutePath(capabilitiesFetched, userHasMlUserPermissions),
    [capabilitiesFetched, userHasMlUserPermissions]
  );

  const mlNetworkPathCallback = useCallback(
    ({ match }) => <MlNetworkConditionalContainer url={match.url} />,
    []
  );

  const networkDetailsPageBasePathCallback = useCallback(
    ({
      location: { search = '' },
      match: {
        params: { detailName },
      },
    }) => {
      history.replace(`ip/${detailName}/${FlowTarget.source}${search}`);
      return null;
    },
    [history]
  );

  const basePathCallback = useCallback(
    ({ location: { search = '' } }) => {
      history.replace(`${NetworkRouteType.flows}${search}`);
      return null;
    },
    [history]
  );

  return (
    <Switch>
      <Route path="/ml-network" render={mlNetworkPathCallback} />
      <Route strict path={networkRoutePath}>
        <Network
          networkPagePath={networkPagePath}
          capabilitiesFetched={capabilities.capabilitiesFetched}
          hasMlUserPermissions={userHasMlUserPermissions}
        />
      </Route>
      <Route path={`${networkDetailsPageBasePath}/:flowTarget`}>
        <NetworkDetails />
      </Route>
      <Route path={networkDetailsPageBasePath} render={networkDetailsPageBasePathCallback} />
      <Route path="/" render={basePathCallback} />
    </Switch>
  );
};

export const NetworkContainer = React.memo(NetworkContainerComponent);
