/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import React, { createContext, useState, useEffect } from 'react';

interface Props {
  history: History;
}

const initialLocation = {} as Location;

const LocationContext = createContext(initialLocation);
const LocationProvider: React.FC<Props> = ({ history, children }) => {
  const [location, setLocation] = useState(history.location);

  useEffect(() => {
    const unlisten = history.listen(updatedLocation => {
      setLocation(updatedLocation);
    });

    return unlisten;
  }, []);

  return <LocationContext.Provider children={children} value={location} />;
};

export { LocationContext, LocationProvider };
