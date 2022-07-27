/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';

import type { UsePackageIconType } from '../hooks';
import { usePackageIconType } from '../hooks';

export const PackageIcon: React.FunctionComponent<
  UsePackageIconType & Omit<EuiIconProps, 'type'>
> = ({ packageName, integrationName, version, icons, tryApi, ...euiIconProps }) => {
  const iconType = usePackageIconType({ packageName, integrationName, version, icons, tryApi });
  // @ts-expect-error loading="lazy" is not supported by EuiIcon
  return <EuiIcon size="s" type={iconType} {...euiIconProps} loading="lazy" />;
};

export const CardIcon: React.FunctionComponent<UsePackageIconType & Omit<EuiIconProps, 'type'>> = (
  props
) => {
  const { icons } = props;
  if (icons && icons.length === 1 && icons[0].type === 'eui') {
    return <EuiIcon size={'xl'} type={icons[0].src} {...props} />;
  } else if (icons && icons.length === 1 && icons[0].type === 'svg') {
    // @ts-expect-error loading="lazy" is not supported by EuiIcon
    return <EuiIcon size={'xl'} type={icons[0].src} {...props} loading="lazy" />;
  } else {
    return <PackageIcon {...props} />;
  }
};
