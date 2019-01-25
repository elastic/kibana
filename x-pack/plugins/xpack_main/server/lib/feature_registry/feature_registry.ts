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
  metadata?: {
    tooltip?: string;
  };
  grantWithBaseRead?: boolean;
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
  management?: {
    [sectionId: string]: string[];
  };
  catalogue?: string[];
  privileges: {
    [key: string]: FeaturePrivilegeDefinition;
  };
}

// Each feature gets its own property on the UICapabilities object,
// but that object has a few built-in properties which should not be overwritten.
const prohibitedFeatureIds: Array<keyof UICapabilities> = ['catalogue', 'management', 'navLinks'];

const featurePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const managementSectionIdRegex = /^[a-zA-Z0-9_-]+$/;
export const uiCapabilitiesRegex = /^[a-zA-Z0-9:_-]+$/;

const managementSchema = Joi.object().pattern(
  managementSectionIdRegex,
  Joi.array().items(Joi.string())
);
const catalogueSchema = Joi.array().items(Joi.string());

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
  management: managementSchema,
  catalogue: catalogueSchema,
  privileges: Joi.object()
    .pattern(
      featurePrivilegePartRegex,
      Joi.object({
        metadata: Joi.object({
          tooltip: Joi.string(),
        }),
        grantWithBaseRead: Joi.bool(),
        management: managementSchema,
        catalogue: catalogueSchema,
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
});

export class FeatureRegistry {
  private locked = false;
  private features: Record<string, Feature> = {};

  public register(feature: Feature) {
    if (this.locked) {
      throw new Error(`Features are locked, can't register new features`);
    }

    validateFeature(feature);

    if (feature.id in this.features) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    this.features[feature.id] = feature;
  }

  public getAll(): Feature[] {
    this.locked = true;
    return _.cloneDeep(Object.values(this.features));
  }
}

function validateFeature(feature: Feature) {
  const validateResult = Joi.validate(feature, schema);
  if (validateResult.error) {
    throw validateResult.error;
  }
// the following validation can't be enforced by the Joi schema, since it'd require us looking "up" the object graph for the list of valid value, which they explicitly forbid.
  const { management = {}, catalogue = [] } = feature;

  Object.entries(feature.privileges).forEach(([privilegeId, privilegeDefinition]) => {
    const unknownCatalogueEntries = _.difference(privilegeDefinition.catalogue || [], catalogue);
    if (unknownCatalogueEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown catalogue entries: ${unknownCatalogueEntries.join(', ')}`
      );
    }

    Object.entries(privilegeDefinition.management || {}).forEach(
      ([managementSectionId, managementEntry]) => {
        if (!management[managementSectionId]) {
          throw new Error(
            `Feature privilege ${
              feature.id
            }.${privilegeId} has unknown management section: ${managementSectionId}`
          );
        }

        const unknownSectionEntries = _.difference(
          managementEntry,
          management[managementSectionId]
        );

        if (unknownSectionEntries.length > 0) {
          throw new Error(
            `Feature privilege ${
              feature.id
            }.${privilegeId} has unknown management entries for section ${managementSectionId}: ${unknownSectionEntries.join(
              ', '
            )}`
          );
        }
      }
    );
  });
}
