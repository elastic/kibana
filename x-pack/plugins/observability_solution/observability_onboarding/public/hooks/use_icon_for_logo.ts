/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { SupportedLogo } from './types';

export function useIconForLogo(logo?: SupportedLogo): string | undefined {
  const {
    services: { http },
  } = useKibana();
  switch (logo) {
    case 'aws':
      return 'logoAWS';
    case 'azure':
      return 'logoAzure';
    case 'gcp':
      return 'logoGCP';
    case 'kubernetes':
      return 'logoKubernetes';
    case 'nginx':
      return 'logoNginx';
    case 'prometheus':
      return 'logoPrometheus';
    case 'docker':
      return 'logoDocker';
    default:
      return http?.staticAssets.getPluginAssetHref(`${logo}.svg`);
  }
}
