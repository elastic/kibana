/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useLocation, Redirect } from 'react-router-dom';

// url has to start with /
const RedirectWithSearchComponent = ({ url }: { url: string }) => {
  const { search = '' } = useLocation();

  return <Redirect from={`${url}/`} to={`${url}${search}`} />;
};

RedirectWithSearchComponent.displayName = 'RedirectWithSearchComponent';

export const RedirectWithSearch = React.memo(RedirectWithSearchComponent);

RedirectWithSearch.displayName = 'RedirectWithSearch';
