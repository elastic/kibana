/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { uiModules } from 'ui/modules';
import { Path } from 'plugins/xpack_main/services/path';
import { Telemetry } from './telemetry';
import { fetchTelemetry } from './fetch_telemetry';
import { npStart } from 'ui/new_platform';

function telemetryStart($injector) {
  const telemetryEnabled = npStart.core.injectedMetadata.getInjectedVar('telemetryEnabled');

  if (telemetryEnabled) {
    // no telemetry for non-logged in users
    if (Path.isUnauthenticated()) { return; }

    const $http = $injector.get('$http');
    const sender = new Telemetry($injector, () => fetchTelemetry($http));

    sender.start();
  }
}

uiModules.get('telemetry/hacks').run(telemetryStart);
