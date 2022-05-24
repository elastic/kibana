/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Route, Switch } from 'react-router-dom';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { ElasticsearchGuide } from './components/elasticsearch_guide';

import { ROOT_PATH } from './routes';

export const Elasticsearch: React.FC<InitialAppData> = (props) => {
  const { enterpriseSearchVersion, kibanaVersion } = props;
  const incompatibleVersions = isVersionMismatch(enterpriseSearchVersion, kibanaVersion);

  const showView = () => {
    if (incompatibleVersions) {
      return (
        <VersionMismatchPage
          enterpriseSearchVersion={enterpriseSearchVersion}
          kibanaVersion={kibanaVersion}
        />
      );
    }

    return <ElasticsearchGuide />;
  };

  return (
    <Switch>
      <Route exact path={ROOT_PATH}>
        {showView()}
      </Route>
    </Switch>
  );
};
