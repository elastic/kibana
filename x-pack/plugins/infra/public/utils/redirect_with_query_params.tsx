/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { Route, Redirect, RouteProps, RedirectProps } from 'react-router-dom';

interface RedirectWithQueryParamsProps extends Omit<RedirectProps, 'to'> {
  from: string;
  to: string | RouteProps['location'];
}

// This workaround preserves query parameters in the redirect
// https://github.com/ReactTraining/react-router/issues/5818#issuecomment-379212014
export const RedirectWithQueryParams: React.FunctionComponent<RedirectWithQueryParamsProps> = ({
  from,
  to,
  ...rest
}) => {
  return (
    <Route
      path={from}
      render={({ location }: RouteProps) => {
        return location ? (
          <Redirect
            {...rest}
            from={from}
            to={
              typeof to === 'string'
                ? {
                    ...location,
                    pathname: to,
                  }
                : {
                    ...location,
                    ...to,
                  }
            }
          />
        ) : null;
      }}
    />
  );
};
