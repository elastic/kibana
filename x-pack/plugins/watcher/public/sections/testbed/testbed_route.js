/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import template from './testbed_route.html';
import './components/testbed';

routes
  .when('/management/elasticsearch/watches/testbed/:data?', {
    template: template,
    resolve: {
      data: function ($route) {
        return $route.current.params.data;
      }
    },
    controllerAs: 'testbedRoute',
    controller: class TestbedRouteController {
      constructor($injector) {
        const $route = $injector.get('$route');
        this.data = $route.current.locals.data;
      }
    }
  });
