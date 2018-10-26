/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


// import the uiExports that we want to "use"
import 'uiExports/fieldFormats';
import 'uiExports/savedObjectTypes';

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
import 'plugins/ml/services/calendar_service';
import 'plugins/ml/components/messagebar';
import 'plugins/ml/datavisualizer';
import 'plugins/ml/explorer';
import 'plugins/ml/timeseriesexplorer';
import 'plugins/ml/components/form_label';
import 'plugins/ml/components/json_tooltip';
import 'plugins/ml/components/tooltip';
import 'plugins/ml/components/confirm_modal';
import 'plugins/ml/components/nav_menu';
import 'plugins/ml/components/loading_indicator';
import 'plugins/ml/settings';
import 'plugins/ml/file_datavisualizer';

import uiRoutes from 'ui/routes';

if (typeof uiRoutes.enable === 'function') {
  uiRoutes.enable();
}

uiRoutes
  .otherwise({
    redirectTo: '/jobs'
  });
