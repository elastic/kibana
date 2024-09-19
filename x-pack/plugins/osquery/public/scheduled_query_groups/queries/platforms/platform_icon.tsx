/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React from 'react';
import { getPlatformIconModule } from './helpers';

interface PlatformIconProps {
  platform: string;
}

const PlatformIconComponent: React.FC<PlatformIconProps> = ({ platform }) => {
  const platformIconModule = getPlatformIconModule(platform);
  return <EuiIcon type={platformIconModule} title={platform} size="l" />;
};

export const PlatformIcon = React.memo(PlatformIconComponent);
