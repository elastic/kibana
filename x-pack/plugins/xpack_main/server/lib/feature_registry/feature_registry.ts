/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IconType } from '@elastic/eui';
import Joi from 'joi';
import _ from 'lodash';
import { UICapabilities } from 'ui/capabilities';

export interface FeaturePrivilegeDefinition {
  management?: {
    [sectionId: string]: string[];
  };
  catalogue?: string[];
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
  validLicenses?: Array<'basic' | 'standard' | 'gold' | 'platinum'>;
  icon?: IconType;
  description?: string;
  navLinkId?: string;
  privileges: {
    [key: string]: FeaturePrivilegeDefinition;
  };
  privilegesTooltip?: string;
}

// Each feature gets its own property on the UICapabilities object,
// but that object has a few built-in properties which should not be overwritten.
const prohibitedFeatureIds: Array<keyof UICapabilities> = ['catalogue', 'management', 'navLinks'];

const featurePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const managementSectionIdRegex = /^[a-zA-Z0-9_-]+$/;
export const uiCapabilitiesRegex = /^[a-zA-Z0-9:_-]+$/;

const schema = Joi.object({
  id: Joi.string()
    .regex(featurePrivilegePartRegex)
    .invalid(...prohibitedFeatureIds)
    .required(),
  name: Joi.string().required(),
  validLicenses: Joi.array().items(Joi.string().valid('basic', 'standard', 'gold', 'platinum')),
  icon: Joi.string(),
  description: Joi.string(),
  navLinkId: Joi.string(),
  privileges: Joi.object()
    .pattern(
      featurePrivilegePartRegex,
      Joi.object({
        management: Joi.object().pattern(managementSectionIdRegex, Joi.array().items(Joi.string())),
        catalogue: Joi.array().items(Joi.string()),
        api: Joi.array().items(Joi.string()),
        app: Joi.array()
          .items(Joi.string())
          .required(),
        savedObject: Joi.object({
          all: Joi.array()
            .items(Joi.string())
            .required(),
          read: Joi.array()
            .items(Joi.string())
            .required(),
        }).required(),
        ui: Joi.array()
          .items(Joi.string().regex(uiCapabilitiesRegex))
          .required(),
      })
    )
    .required(),
  privilegesTooltip: Joi.string(),
});

const features: Record<string, Feature> = {};

export function registerFeature(feature: Feature) {
  const validateResult = Joi.validate(feature, schema);
  if (validateResult.error) {
    throw validateResult.error;
  }

  if (feature.id in features) {
    throw new Error(`Feature with id ${feature.id} is already registered.`);
  }

  features[feature.id] = feature;
}

export function unregisterFeature(feature: Feature) {
  delete features[feature.id];
}

export function getFeatures(): Feature[] {
  return _.cloneDeep(Object.values(features));
}
