/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React from 'react';
import { IUrlParams } from 'x-pack/plugins/apm/public/store/urlParams';
import { ErrorGroupOverviewRequest } from '../../../store/reactReduxRequest/errorGroupList';
// @ts-ignore
import List from './List';

interface ErrorGroupOverviewProps {
  urlParams: IUrlParams;
  location: Location;
}

const ErrorGroupOverview: React.SFC<ErrorGroupOverviewProps> = ({
  urlParams,
  location
}) => {
  return (
    <ErrorGroupOverviewRequest
      urlParams={urlParams}
      render={({ data }) => (
        <List urlParams={urlParams} items={data} location={location} />
      )}
    />
  );
};

export { ErrorGroupOverview };
