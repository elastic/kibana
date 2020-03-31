/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { EuiIcon, EuiIconProps } from '@elastic/eui';
import { PackageInfo, PackageListItem } from '../../../../common/types/models';
import { usePackageIconType } from '../hooks';
type Package = PackageInfo | PackageListItem;

export const PackageIcon: React.FunctionComponent<{
  packageName: string;
  version?: string;
  icons?: Package['icons'];
} & Omit<EuiIconProps, 'type'>> = ({ packageName, version, icons, ...euiIconProps }) => {
  const iconType = usePackageIconType({ packageName, version, icons });
  return <EuiIcon size="s" type={iconType} {...euiIconProps} />;
};
