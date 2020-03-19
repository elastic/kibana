/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ICON_TYPES, EuiIcon, EuiIconProps } from '@elastic/eui';
import { PackageInfo, PackageListItem } from '../../../types';
import { useLinks } from '../hooks';

type Package = PackageInfo | PackageListItem;

export const PackageIcon: React.FunctionComponent<{
  packageName: string;
  icons?: Package['icons'];
} & Omit<EuiIconProps, 'type'>> = ({ packageName, icons, ...euiIconProps }) => {
  const { toImage } = useLinks();
  // try to find a logo in EUI
  const euiLogoIcon = ICON_TYPES.find(key => key.toLowerCase() === `logo${packageName}`);
  const svgIcons = icons?.filter(icon => icon.type === 'image/svg+xml');
  const localIcon = svgIcons && Array.isArray(svgIcons) && svgIcons[0];
  const pathToLocal = localIcon && toImage(localIcon.src);
  const euiIconType = pathToLocal || euiLogoIcon || 'package';

  return <EuiIcon size="s" type={euiIconType} {...euiIconProps} />;
};
