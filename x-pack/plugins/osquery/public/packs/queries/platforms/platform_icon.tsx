/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon } from '@elastic/eui';
import React, { useEffect, useState } from 'react';
import { getPlatformIconModule } from './helpers';

export interface PlatformIconProps {
  platform: string;
}

const PlatformIconComponent: React.FC<PlatformIconProps> = ({ platform }) => {
  const [Icon, setIcon] = useState<React.ReactElement | null>(null);

  // FIXME: This is a hack to force the icon to be loaded asynchronously.
  useEffect(() => {
    const interval = setInterval(() => {
      const platformIconModule = getPlatformIconModule(platform);
      setIcon(<EuiIcon type={platformIconModule} title={platform} size="l" />);
    }, 0);

    return () => clearInterval(interval);
  }, [platform, setIcon]);

  return Icon;
};

export const PlatformIcon = React.memo(PlatformIconComponent);
