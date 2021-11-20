/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { SpaceListProps } from './types';

export const getSpaceListComponent = async (): Promise<React.FC<SpaceListProps>> => {
  const { SpaceListInternal } = await import('./space_list_internal');
  return (props: SpaceListProps) => {
    return <SpaceListInternal {...props} />;
  };
};
