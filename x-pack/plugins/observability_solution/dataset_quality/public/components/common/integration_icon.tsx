/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import { PackageIcon } from '@kbn/fleet-plugin/public';
import React from 'react';
import { NONE } from '../../../common/constants';
import { Integration } from '../../../common/data_streams_stats/integration';
import loggingIcon from '../../icons/logging.svg';

interface IntegrationIconProps {
  integration?: Integration;
}

export const IntegrationIcon = ({ integration }: IntegrationIconProps) => {
  return integration && integration.name !== NONE ? (
    <PackageIcon
      packageName={integration.name}
      version={integration.version!}
      icons={integration.icons}
      size="m"
      tryApi
    />
  ) : (
    <EuiIcon type={loggingIcon} size="m" />
  );
};
