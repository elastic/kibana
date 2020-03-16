/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { macosInstallTemplate } from './install_templates/macos';

export function getScript(osType: 'macos', kibanaUrl: string): string {
  const variables = { kibanaUrl };

  switch (osType) {
    case 'macos':
      return macosInstallTemplate(variables);
    default:
      throw new Error(`${osType} is not supported.`);
  }
}
