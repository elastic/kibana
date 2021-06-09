/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useEffect, useState, useMemo } from 'react';

import { PlatformIcon } from './platform_icon';
import { PlatformType } from './types';

interface PlatformIconsProps {
  platform: string;
}

const PlatformIconsComponent: React.FC<PlatformIconsProps> = ({ platform }) => {
  const [platforms, setPlatforms] = useState<string[]>([
    PlatformType.darwin,
    PlatformType.linux,
    PlatformType.windows,
  ]);

  useEffect(() => {
    setPlatforms((prevValue) => {
      let platformArray: string[];
      try {
        platformArray = platform?.split(',').map((platformString) => platformString.trim());
      } catch (e) {
        return prevValue;
      }
      return platformArray;
    });
  }, [platform]);

  const content = useMemo(
    () =>
      platforms.map((platformString) => (
        <EuiFlexItem key={platformString} grow={false}>
          <PlatformIcon platform={platformString} />
        </EuiFlexItem>
      )),
    [platforms]
  );

  return <EuiFlexGroup gutterSize="s">{content}</EuiFlexGroup>;
};

export const PlatformIcons = React.memo(PlatformIconsComponent);
