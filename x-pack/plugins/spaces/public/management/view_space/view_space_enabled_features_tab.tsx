/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { KibanaFeature } from '@kbn/features-plugin/common';

import type { Space } from '../../../common';
import { EnabledFeatures } from '../edit_space/enabled_features';

interface Props {
  space: Space;
  features: KibanaFeature[];
}

export const ViewSpaceEnabledFeatures: FC<Props> = ({ features, space }) => {
  if (!features) {
    return null;
  }

  return <EnabledFeatures features={features} space={space} />;
};
