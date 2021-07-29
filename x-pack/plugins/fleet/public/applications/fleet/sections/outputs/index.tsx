/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Router, Route, Switch, useHistory } from 'react-router-dom';

import { OutputsListPage } from './outputs_list_page';

export const OutputsApp = () => {
  const history = useHistory();

  return (
    <>
      <OutputsListPage />
    </>
    // <Router history={history}>
    //   <Switch>
    //     <Route path={FLEET_ROUTING_PATHS.agent_details}>
    //       <AgentDetailsPage />
    //     </Route>
    //     <Route path={FLEET_ROUTING_PATHS.agents}>
    //       <DefaultLayout section="agents" rightColumn={rightColumn}>
    //         {fleetServerModalVisible && (
    //           <FleetServerUpgradeModal onClose={onCloseFleetServerModal} />
    //         )}
    //         {hasOnlyFleetServerMissingRequirement ? (
    //           <FleetServerRequirementPage />
    //         ) : (
    //           <AgentListPage />
    //         )}
    //       </DefaultLayout>
    //     </Route>
    //   </Switch>
    // </Router>
  );
};
