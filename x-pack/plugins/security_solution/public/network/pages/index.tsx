/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { Navigate, Routes } from 'react-router-dom';
import { Route } from '@kbn/kibana-react-plugin/public';

import { useMlCapabilities } from '../../common/components/ml/hooks/use_ml_capabilities';
import { hasMlUserPermissions } from '../../../common/machine_learning/has_ml_user_permissions';

import { NetworkDetails } from './details';
import { Network } from './network';
import { getNetworkRoutePath } from './navigation';
import { NetworkRouteType } from './navigation/types';
import { MlNetworkConditionalContainer } from '../../common/components/ml/conditional_links/ml_network_conditional_container';
import { NETWORK_PATH } from '../../../common/constants';
import { FlowTargetSourceDest } from '../../../common/search_strategy';
import {
  FLOW_TARGET_PARAM,
  NETWORK_DETAILS_PAGE_PATH,
  NETWORK_DETAILS_TAB_PATH,
} from './constants';

const getPathWithFlowType = (detailName: string, flowTarget?: FlowTargetSourceDest) =>
  `${NETWORK_PATH}/ip/${detailName}/${flowTarget || FlowTargetSourceDest.source}/${
    NetworkRouteType.flows
  }`;

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
    <Routes>
      <Route
        path={NETWORK_PATH}
        render={({ location: { search = '' } }) => (
          <Navigate to={{ pathname: `${NETWORK_PATH}/${NetworkRouteType.flows}`, search }} />
        )}
      />
      <Route path={`${NETWORK_PATH}/ml-network`} element={<MlNetworkConditionalContainer />} />
      <Route
        path={networkRoutePath}
        element={
          <Network
            capabilitiesFetched={capabilities.capabilitiesFetched}
            hasMlUserPermissions={userHasMlUserPermissions}
          />
        }
      />
      <Route path={NETWORK_DETAILS_TAB_PATH} element={<NetworkDetails />} />
      <Route
        path={`${NETWORK_DETAILS_PAGE_PATH}/:flowTarget(${FLOW_TARGET_PARAM})?`}
        render={({
          match: {
            params: { detailName, flowTarget },
          },
          location: { search = '' },
        }) => (
          <Navigate
            to={{
              pathname: getPathWithFlowType(detailName, flowTarget),
              search,
            }}
          />
        )}
      />
      <Route>
        <Navigate
          to={{
            pathname: NETWORK_PATH,
          }}
        />
      </Route>
    </Routes>
  );
};

export const NetworkContainer = React.memo(NetworkContainerComponent);
