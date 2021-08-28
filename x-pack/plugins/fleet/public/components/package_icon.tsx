/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiIconProps } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import React from 'react';

import type { UsePackageIconType } from '../hooks/use_package_icon_type';
import { usePackageIconType } from '../hooks/use_package_icon_type';

export const PackageIcon: React.FunctionComponent<
  UsePackageIconType & Omit<EuiIconProps, 'type'>
> = ({ packageName, integrationName, version, icons, tryApi, ...euiIconProps }) => {
  const iconType = usePackageIconType({ packageName, integrationName, version, icons, tryApi });
  return <EuiIcon size="s" type={iconType} {...euiIconProps} />;
};
