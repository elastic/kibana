/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SpaceAvatarProps } from './types';

export const getSpaceAvatarComponent = async (): Promise<React.FC<SpaceAvatarProps>> => {
  const { SpaceAvatarInternal } = await import('./space_avatar_internal');
  return (props: SpaceAvatarProps) => {
    return <SpaceAvatarInternal {...props} />;
  };
};
