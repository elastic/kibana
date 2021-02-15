/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { SpaceListProps } from '../../../../../src/plugins/spaces_oss/public';
import { SpaceListInternal } from './space_list_internal';

export const getSpaceListComponent = (): React.FC<SpaceListProps> => {
  return (props: SpaceListProps) => {
    return <SpaceListInternal {...props} />;
  };
};
