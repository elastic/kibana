/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { ICON_TYPES, EuiIcon, EuiIconProps } from '@elastic/eui';

const DEFAULT_ICON_TYPE = 'savedObjectsApp';

export const PackageIcon: React.FunctionComponent<{
  packageName: string;
} & Omit<EuiIconProps, 'type'>> = ({ packageName, ...rest }) => {
  // try to find a logo in EUI
  // TODO: first try to find icon in `icons` property
  const iconType =
    ICON_TYPES.find(key => key.toLowerCase() === `logo${packageName}`) || DEFAULT_ICON_TYPE;
  return <EuiIcon type={iconType} {...rest} />;
};
