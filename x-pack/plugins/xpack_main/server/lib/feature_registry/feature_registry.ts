/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconType } from '@elastic/eui';
import _ from 'lodash';

export interface FeaturePrivilegeDefinition {
  api?: string[];
  app: string[];
  savedObject: {
    all: string[];
    read: string[];
  };
  ui: string[];
}

export interface Feature {
  id: string;
  name: string;
  validLicenses?: Array<'basic' | 'gold' | 'platinum'>;
  icon?: IconType;
  description?: string;
  navLinkId?: string;
  privileges: {
    [key: string]: FeaturePrivilegeDefinition;
  };
}

const features: Record<string, Feature> = {};

export function registerFeature(feature: Feature) {
  if (feature.id in features) {
    throw new Error(`Feature with id ${feature.id} is already registered.`);
  }

  features[feature.id] = feature;
}

export function getFeatures(): Feature[] {
  return _.cloneDeep(Object.values(features));
}
