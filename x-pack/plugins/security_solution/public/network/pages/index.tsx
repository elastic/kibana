/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo } from 'react';
import { Route, Switch, RouteComponentProps, useHistory } from 'react-router-dom';

import { useMlCapabilities } from '../../common/components/ml_popover/hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';
import { FlowTarget } from '../../graphql/types';

import { IPDetails } from './ip_details';
import { Network } from './network';
import { GlobalTime } from '../../common/containers/global_time';
import { getNetworkRoutePath } from './navigation';
import { NetworkRouteType } from './navigation/types';
import { MlNetworkConditionalContainer } from '../../common/components/ml/conditional_links/ml_network_conditional_container';

type Props = Partial<RouteComponentProps<{}>> & { url: string };

const networkPagePath = '';
const ipDetailsPageBasePath = `/ip/:detailName`;

const NetworkContainerComponent: React.FC<Props> = () => {
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

  return (
    <GlobalTime>
      {({ to, from, setQuery, deleteQuery, isInitializing }) => (
        <Switch>
          <Route
            path="/ml-network"
            render={({ location, match }) => (
              <MlNetworkConditionalContainer location={location} url={match.url} />
            )}
          />
          <Route
            strict
            path={networkRoutePath}
            render={() => (
              <Network
                networkPagePath={networkPagePath}
                to={to}
                from={from}
                setQuery={setQuery}
                deleteQuery={deleteQuery}
                isInitializing={isInitializing}
                capabilitiesFetched={capabilities.capabilitiesFetched}
                hasMlUserPermissions={userHasMlUserPermissions}
              />
            )}
          />
          <Route
            path={`${ipDetailsPageBasePath}/:flowTarget`}
            render={({
              match: {
                params: { detailName, flowTarget },
              },
            }) => (
              <IPDetails
                detailName={detailName}
                flowTarget={flowTarget}
                to={to}
                from={from}
                setQuery={setQuery}
                deleteQuery={deleteQuery}
                isInitializing={isInitializing}
              />
            )}
          />
          <Route
            path={ipDetailsPageBasePath}
            render={({
              location: { search = '' },
              match: {
                params: { detailName },
              },
            }) => {
              history.replace(`ip/${detailName}/${FlowTarget.source}${search}`);
              return null;
            }}
          />
          <Route
            path="/"
            render={({ location: { search = '' } }) => {
              history.replace(`${NetworkRouteType.flows}${search}`);
              return null;
            }}
          />
        </Switch>
      )}
    </GlobalTime>
  );
};

export const NetworkContainer = React.memo(NetworkContainerComponent);
