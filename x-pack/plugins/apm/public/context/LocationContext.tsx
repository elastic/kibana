/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { History, Location } from 'history';
import React, { createContext, useReducer, useState } from 'react';
import {
  IUrlParams,
  urlParamsReducer,
  refreshTimeRange,
  TimeRange,
  resolveUrlParams
} from '../store/urlParams';
import { LOCATION_UPDATE } from '../store/location';

interface Props {
  history: History;
}

interface State {
  location: Location;
  urlParams: IUrlParams;
  refreshTimeRange?: (time: TimeRange) => void;
}

const initialState: State = {
  location: {} as Location,
  urlParams: {} as IUrlParams
};

const LocationContext = createContext(initialState);
const LocationProvider: React.FC<Props> = ({ history, ...props }) => {
  const [location, setLocation] = useState(history.location);
  const [urlParams, dispatch] = useReducer(
    urlParamsReducer,
    resolveUrlParams(location)
  );

  history.listen(updatedLocation => {
    setLocation(updatedLocation);
    dispatch({ type: LOCATION_UPDATE, location: updatedLocation });
  });

  return (
    <LocationContext.Provider
      {...props}
      value={{
        location,
        urlParams,
        refreshTimeRange: (time: TimeRange) => dispatch(refreshTimeRange(time))
      }}
    />
  );
};

export { LocationContext, LocationProvider };
