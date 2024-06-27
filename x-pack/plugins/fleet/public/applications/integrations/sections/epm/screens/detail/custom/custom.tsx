/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo, useMemo } from 'react';
import { Redirect } from 'react-router-dom';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';

import { useLink, useUIExtension } from '../../../../../hooks';
import type { PackageInfo } from '../../../../../types';
import { pkgKeyFromPackageInfo } from '../../../../../services';
import { ExtensionWrapper } from '../../../../../components';

interface Props {
  packageInfo: PackageInfo;
}

export const CustomViewPage: React.FC<Props> = memo(({ packageInfo }) => {
  const customViewExtension = useUIExtension(packageInfo.name, 'package-detail-custom');
  const { getPath } = useLink();
  const pkgkey = useMemo(() => pkgKeyFromPackageInfo(packageInfo), [packageInfo]);

  return customViewExtension ? (
    <EuiFlexGroup alignItems="flexStart">
      <EuiFlexItem grow={1} />
      <EuiFlexItem grow={7}>
        <ExtensionWrapper>
          <customViewExtension.Component pkgkey={pkgkey} packageInfo={packageInfo} />
        </ExtensionWrapper>
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <Redirect to={getPath('integration_details_overview', { pkgkey })} />
  );
});
