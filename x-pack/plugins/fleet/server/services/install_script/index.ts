/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { appContextService } from '../app_context';
import { macosInstallTemplate } from './install_templates/macos';
import { linuxInstallTemplate } from './install_templates/linux';

export function getScript(osType: 'macos' | 'linux', kibanaUrl: string): string {
  const variables = { kibanaUrl, kibanaVersion: appContextService.getKibanaVersion() };

  switch (osType) {
    case 'macos':
      return macosInstallTemplate(variables);
    case 'linux':
      return linuxInstallTemplate(variables);
    default:
      throw new Error(`${osType} is not supported.`);
  }
}
