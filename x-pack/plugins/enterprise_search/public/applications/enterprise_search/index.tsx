/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { useValues } from 'kea';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { HttpLogic } from '../shared/http';
import { KibanaLogic } from '../shared/kibana';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { ErrorConnecting } from './components/error_connecting';
import { ProductSelector } from './components/product_selector';
import { SetupGuide } from './components/setup_guide';
import { ROOT_PATH, SETUP_GUIDE_PATH } from './routes';

export const EnterpriseSearch: React.FC<InitialAppData> = ({
  access = {},
  workplaceSearch,
  enterpriseSearchVersion,
  kibanaVersion,
}) => {
  const { errorConnecting } = useValues(HttpLogic);
  const { config } = useValues(KibanaLogic);

  const showErrorConnecting = !!(config.host && errorConnecting);
  const incompatibleVersions = !!(
    config.host && isVersionMismatch(enterpriseSearchVersion, kibanaVersion)
  );
  const isWorkplaceSearchAdmin = !!workplaceSearch?.account?.isAdmin;

  const showView = () => {
    if (incompatibleVersions) {
      return (
        <VersionMismatchPage
          enterpriseSearchVersion={enterpriseSearchVersion}
          kibanaVersion={kibanaVersion}
        />
      );
    } else if (showErrorConnecting) {
      return <ErrorConnecting />;
    }

    return <ProductSelector isWorkplaceSearchAdmin={isWorkplaceSearchAdmin} access={access} />;
  };

  return (
    <Switch>
      <Route exact path={SETUP_GUIDE_PATH}>
        <SetupGuide />
      </Route>
      <Route exact path={ROOT_PATH}>
        {showView()}
      </Route>
    </Switch>
  );
};
