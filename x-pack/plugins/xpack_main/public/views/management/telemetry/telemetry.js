/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import routes from 'ui/routes';
import template from 'plugins/xpack_main/views/management/telemetry/telemetry.html';

import { TelemetryOptInProvider } from '../../../services/telemetry_opt_in';
import { ManageTelemetryPage } from './manage_telemetry_page';

routes.when('/management/kibana/telemetry', {
  template,
  controllerAs: 'telemetryCtrl',
  controller($scope, $route, kbnUrl, Private) {

    $scope.$$postDigest(() => {
      const domNode = document.getElementById('telemetryReactRoot');

      const telemetryOptInProvider = Private(TelemetryOptInProvider);

      render(<ManageTelemetryPage telemetryOptInProvider={telemetryOptInProvider} />, domNode);

      // unmount react on controller destroy
      $scope.$on('$destroy', () => {
        unmountComponentAtNode(domNode);
      });
    });
  }

});