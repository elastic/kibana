/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



import 'ui/courier';
import 'ui-bootstrap';
import 'ui/persisted_log';
import 'ui/autoload/all';

import 'plugins/ml/styles/main.less';
import 'plugins/ml/access_denied';
import 'plugins/ml/factories/listener_factory';
import 'plugins/ml/factories/state_factory';
import 'plugins/ml/lib/angular_bootstrap_patch';
import 'plugins/ml/jobs';
import 'plugins/ml/services/ml_clipboard_service';
import 'plugins/ml/services/job_service';
import 'plugins/ml/services/calendar_service';
import 'plugins/ml/services/ml_api_service';
import 'plugins/ml/services/results_service';
import 'plugins/ml/components/messagebar';
import 'plugins/ml/datavisualizer';
import 'plugins/ml/explorer';
import 'plugins/ml/timeseriesexplorer';
import 'plugins/ml/components/form_label';
import 'plugins/ml/components/json_tooltip';
import 'plugins/ml/components/confirm_modal';
import 'plugins/ml/components/nav_menu';
import 'plugins/ml/components/loading_indicator';
import 'plugins/ml/settings';

import uiRoutes from 'ui/routes';
import moment from 'moment-timezone';
import { uiModules } from 'ui/modules';

const uiModule = uiModules.get('kibana');
uiModule.run((config) => {
  // Set the timezone for moment formatting to that configured in Kibana.
  moment.tz.setDefault(config.get('dateFormat:tz'));
});

if (typeof uiRoutes.enable === 'function') {
  uiRoutes.enable();
}

uiRoutes
  .otherwise({
    redirectTo: '/jobs'
  });

