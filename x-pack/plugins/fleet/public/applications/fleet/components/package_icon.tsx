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
> = ({ packageName, version, icons, tryApi, ...euiIconProps }) => {
  const iconType = usePackageIconType({ packageName, version, icons, tryApi });
  return <EuiIcon size="s" type={iconType} {...euiIconProps} />;
};
