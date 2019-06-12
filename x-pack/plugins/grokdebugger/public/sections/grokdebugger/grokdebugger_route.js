/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import routes from 'ui/routes';
import 'ui/capabilities/route_setup';
import { toastNotifications } from 'ui/notify';
import { XPackInfoProvider } from 'plugins/xpack_main/services/xpack_info';
import template from './grokdebugger_route.html';
import './directives/grokdebugger';


routes
  .when('/dev_tools/grokdebugger', {
    template: template,
    requireUICapability: 'dev_tools.show',
    resolve: {
      licenseCheckResults(Private) {
        const xpackInfo = Private(XPackInfoProvider);
        return {
          showPage: xpackInfo.get('features.grokdebugger.enableLink'),
          message: xpackInfo.get('features.grokdebugger.message')
        };
      }
    },
    controller: class GrokDebuggerRouteController {
      constructor($injector) {
        const $route = $injector.get('$route');
        const kbnUrl = $injector.get('kbnUrl');

        const licenseCheckResults = $route.current.locals.licenseCheckResults;
        if (!licenseCheckResults.showPage) {
          kbnUrl.change('/dev_tools');
          toastNotifications.addDanger(licenseCheckResults.message);
          return;
        }
      }
    }
  });
