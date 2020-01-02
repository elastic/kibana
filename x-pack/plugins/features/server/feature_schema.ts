/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { difference } from 'lodash';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { FeatureWithAllOrReadPrivileges } from './feature';

// Each feature gets its own property on the UICapabilities object,
// but that object has a few built-in properties which should not be overwritten.
const prohibitedFeatureIds: Array<keyof UICapabilities> = ['catalogue', 'management', 'navLinks'];

const featurePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const managementSectionIdRegex = /^[a-zA-Z0-9_-]+$/;
export const uiCapabilitiesRegex = /^[a-zA-Z0-9:_-]+$/;

const managementSchema = Joi.object().pattern(
  managementSectionIdRegex,
  Joi.array().items(Joi.string().regex(uiCapabilitiesRegex))
);
const catalogueSchema = Joi.array().items(Joi.string().regex(uiCapabilitiesRegex));

const privilegeSchema = Joi.object({
  excludeFromBasePrivileges: Joi.boolean(),
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
  excludeFromBasePrivileges: Joi.boolean(),
  validLicenses: Joi.array().items(Joi.string().valid('basic', 'standard', 'gold', 'platinum')),
  icon: Joi.string(),
  description: Joi.string(),
  navLinkId: Joi.string().regex(uiCapabilitiesRegex),
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

export function validateFeature(feature: FeatureWithAllOrReadPrivileges) {
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
            `Feature privilege ${feature.id}.${privilegeId} has unknown management section: ${managementSectionId}`
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
