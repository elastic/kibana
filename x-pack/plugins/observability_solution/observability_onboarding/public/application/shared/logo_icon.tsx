/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiIconProps } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';

export type SupportedLogo =
  | 'aws'
  | 'azure'
  | 'docker'
  | 'dotnet'
  | 'prometheus'
  | 'gcp'
  | 'java'
  | 'javascript'
  | 'kubernetes'
  | 'nginx'
  | 'apache'
  | 'system'
  | 'opentelemetry';

export function isSupportedLogo(logo: string): logo is SupportedLogo {
  return [
    'aws',
    'azure',
    'docker',
    'dotnet',
    'prometheus',
    'gcp',
    'java',
    'javascript',
    'kubernetes',
    'nginx',
    'system',
    'apache',
    'opentelemetry',
  ].includes(logo);
}

function useIconForLogo(logo?: SupportedLogo): string | undefined {
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

export function LogoIcon({ logo, size }: { logo: SupportedLogo; size?: EuiIconProps['size'] }) {
  const iconType = useIconForLogo(logo);
  if (iconType) {
    return <EuiIcon type={iconType} size={size} />;
  }
  return null;
}
