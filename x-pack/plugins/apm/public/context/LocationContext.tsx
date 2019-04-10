/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import React, { createContext, useState } from 'react';

interface Props {
  history: History;
}

const initialLocation = {} as Location;

const LocationContext = createContext(initialLocation);
const LocationProvider: React.FC<Props> = ({ history, ...props }) => {
  const [location, setLocation] = useState(history.location);
  history.listen(updatedLocation => setLocation(updatedLocation));
  return <LocationContext.Provider {...props} value={location} />;
};

export { LocationContext, LocationProvider };
