/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

type RouteObject = [string, { reloadOnSearch: boolean }];
interface Redirect {
  redirectTo: string;
}

class Routes {
  private routes: RouteObject[] = [];
  public redirect?: Redirect = { redirectTo: '/no-data' };

  public when = (...args: RouteObject) => {
    const [, routeOptions] = args;
    routeOptions.reloadOnSearch = false;
    this.routes.push(args);
    return this;
  };

  public otherwise = (redirect: Redirect) => {
    this.redirect = redirect;
    return this;
  };

  public addToProvider = ($routeProvider: any) => {
    this.routes.forEach((args) => {
      $routeProvider.when.apply(this, args);
    });

    if (this.redirect) {
      $routeProvider.otherwise(this.redirect);
    }
  };
}
export const uiRoutes = new Routes();
