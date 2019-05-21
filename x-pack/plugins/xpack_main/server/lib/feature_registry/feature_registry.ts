/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';
import { cloneDeep, difference, uniq } from 'lodash';
import { UICapabilities } from 'ui/capabilities';

export interface FeatureKibanaPrivileges {
  management?: {
    [sectionId: string]: string[];
  };
  catalogue?: string[];
  api?: string[];
  app?: string[];
  savedObject: {
    all: string[];
    read: string[];
  };
  ui: string[];
}

type PrivilegesSet = Record<string, FeatureKibanaPrivileges>;

export type FeatureWithAllOrReadPrivileges = Feature<{
  all?: FeatureKibanaPrivileges;
  read?: FeatureKibanaPrivileges;
}>;

export interface Feature<TPrivileges extends Partial<PrivilegesSet> = PrivilegesSet> {
  id: string;
  name: string;
  validLicenses?: Array<'basic' | 'standard' | 'gold' | 'platinum'>;
  icon?: string;
  description?: string;
  navLinkId?: string;
  app: string[];
  management?: {
    [sectionId: string]: string[];
  };
  catalogue?: string[];
  privileges: TPrivileges;
  privilegesTooltip?: string;
  reserved?: {
    privilege: FeatureKibanaPrivileges;
    description: string;
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

const privilegeSchema = Joi.object({
  management: managementSchema,
  catalogue: catalogueSchema,
  api: Joi.array().items(Joi.string()),
  app: Joi.array().items(Joi.string()),
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
});

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
  app: Joi.array()
    .items(Joi.string())
    .required(),
  management: managementSchema,
  catalogue: catalogueSchema,
  privileges: Joi.object({
    all: privilegeSchema,
    read: privilegeSchema,
  }).required(),
  privilegesTooltip: Joi.string(),
  reserved: Joi.object({
    privilege: privilegeSchema.required(),
    description: Joi.string().required(),
  }),
});

export class FeatureRegistry {
  private locked = false;
  private features: Record<string, Feature> = {};

  public register(feature: FeatureWithAllOrReadPrivileges) {
    if (this.locked) {
      throw new Error(`Features are locked, can't register new features`);
    }

    validateFeature(feature);

    if (feature.id in this.features) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    const featureCopy: Feature = cloneDeep(feature as Feature);

    this.features[feature.id] = applyAutomaticPrivilegeGrants(featureCopy as Feature);
  }

  public getAll(): Feature[] {
    this.locked = true;
    return cloneDeep(Object.values(this.features));
  }
}

function validateFeature(feature: FeatureWithAllOrReadPrivileges) {
  const validateResult = Joi.validate(feature, schema);
  if (validateResult.error) {
    throw validateResult.error;
  }
  // the following validation can't be enforced by the Joi schema, since it'd require us looking "up" the object graph for the list of valid value, which they explicitly forbid.
  const { app = [], management = {}, catalogue = [] } = feature;

  const privilegeEntries = [...Object.entries(feature.privileges)];
  if (feature.reserved) {
    privilegeEntries.push(['reserved', feature.reserved.privilege]);
  }

  privilegeEntries.forEach(([privilegeId, privilegeDefinition]) => {
    if (!privilegeDefinition) {
      throw new Error('Privilege definition may not be null or undefined');
    }

    const unknownAppEntries = difference(privilegeDefinition.app || [], app);
    if (unknownAppEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown app entries: ${unknownAppEntries.join(', ')}`
      );
    }

    const unknownCatalogueEntries = difference(privilegeDefinition.catalogue || [], catalogue);
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

        const unknownSectionEntries = difference(managementEntry, management[managementSectionId]);

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

function applyAutomaticPrivilegeGrants(feature: Feature): Feature {
  const { all: allPrivilege, read: readPrivilege } = feature.privileges;
  const reservedPrivilege = feature.reserved ? feature.reserved.privilege : null;

  applyAutomaticAllPrivilegeGrants(allPrivilege, reservedPrivilege);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(...allPrivileges: Array<FeatureKibanaPrivileges | null>) {
  allPrivileges.forEach(allPrivilege => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([...allPrivilege.savedObject.read, 'config']);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | null>
) {
  readPrivileges.forEach(readPrivilege => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([...readPrivilege.savedObject.read, 'config']);
    }
  });
}
