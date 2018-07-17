/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import 'ui/autoload/all';
// @ts-ignore: path dynamic for kibana
import { management } from 'ui/management';
// @ts-ignore: path dynamic for kibana
import { uiModules } from 'ui/modules';
// @ts-ignore: path dynamic for kibana
import routes from 'ui/routes';
// @ts-ignore: path dynamic for kibana
import { KibanaFrameworkAdapter } from '../adapters/framework/kibana_framework_adapter';
import { FrontendLibs } from '../lib';

export function compose(): FrontendLibs {
  // const kbnVersion = (window as any).__KBN__.version;

  const pluginUIModule = uiModules.get('app/beats_management');

  const framework = new KibanaFrameworkAdapter(pluginUIModule, management, routes);

  const libs: FrontendLibs = {
    framework,
  };
  return libs;
}
