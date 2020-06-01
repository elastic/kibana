/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Location } from 'history';
import React, { createContext } from 'react';
import { withRouter } from 'react-router-dom';

const initialLocation = {} as Location;

const LocationContext = createContext(initialLocation);
const LocationProvider = withRouter(({ location, children }) => {
  return <LocationContext.Provider children={children} value={location} />;
});

export { LocationContext, LocationProvider };
