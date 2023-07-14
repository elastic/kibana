/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { Routes, Route } from '@kbn/shared-ux-router';

import { isVersionMismatch } from '../../../common/is_version_mismatch';
import { InitialAppData } from '../../../common/types';
import { VersionMismatchPage } from '../shared/version_mismatch';

import { EsreGuide } from './components/esre_guide/esre_guide';

import { ROOT_PATH } from './routes';

export const EnterpriseSearchEsre: React.FC<InitialAppData> = (props) => {
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

    return <EsreGuide />;
  };

  return (
    <Routes>
      <Route exact path={ROOT_PATH}>
        {showView()}
      </Route>
    </Routes>
  );
};
