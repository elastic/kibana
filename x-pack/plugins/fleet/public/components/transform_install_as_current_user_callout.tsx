/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { uniqBy } from 'lodash';

import type { PackageInfo } from '../../common';

export const getNumTransformAssets = (assets?: PackageInfo['assets']) => {
  if (
    !assets ||
    !(
      Array.isArray(assets.elasticsearch?.transform) &&
      (assets.elasticsearch?.transform?.length ?? 0) > 0
    )
  ) {
    return 0;
  }

  return uniqBy(assets.elasticsearch?.transform, 'file').length;
};
export const TransformInstallWithCurrentUserPermissionCallout: React.FunctionComponent<{
  count: number;
}> = ({ count }) => {
  return (
    <EuiCallOut color="primary" iconType="iInCircle">
      <FormattedMessage
        id="xpack.fleet.createPackagePolicy.transformInstallWithCurrentUserPermissionCallout"
        defaultMessage="This package has {count, plural, one {one transform asset} other {# transform assets}} which will be created and started with the same roles as the user installing the package."
        values={{ count }}
      />
    </EuiCallOut>
  );
};
