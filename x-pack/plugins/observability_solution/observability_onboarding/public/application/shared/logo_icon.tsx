/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiAvatar, EuiAvatarProps, EuiIcon, EuiIconProps } from '@elastic/eui';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
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
  if (!logo) return undefined;
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

function toAvatarSize(size?: EuiIconProps['size']): EuiAvatarProps['size'] {
  switch (size) {
    case 's':
      return 's';
    case 'm':
      return 'm';
    case 'l':
      return 'l';
    case 'xl':
      return 'xl';
    default:
      return 'xl';
  }
}

export function LogoIcon({
  logo,
  euiIconType,
  isAvatar,
  size,
  className,
}: {
  logo?: SupportedLogo;
  euiIconType?: EuiIconType;
  isAvatar?: boolean;
  size?: EuiIconProps['size'];
  className?: string;
}) {
  const iconType = useIconForLogo(logo);
  if (euiIconType && isAvatar)
    return (
      <EuiAvatar
        color="subdued"
        iconType={euiIconType}
        name="logoIcon"
        size={toAvatarSize(size)}
        className={className}
      />
    );
  if (iconType || euiIconType) {
    return <EuiIcon type={euiIconType ?? iconType!} size={size} className={className} />;
  }
  return null;
}
