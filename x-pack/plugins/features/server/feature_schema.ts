/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { difference } from 'lodash';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { FeatureConfig } from '../common/feature';
import { FeatureKibanaPrivileges } from '.';

// Each feature gets its own property on the UICapabilities object,
// but that object has a few built-in properties which should not be overwritten.
const prohibitedFeatureIds: Array<keyof UICapabilities> = ['catalogue', 'management', 'navLinks'];

const featurePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const subFeaturePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const managementSectionIdRegex = /^[a-zA-Z0-9_-]+$/;
const reservedFeaturePrrivilegePartRegex = /^(?!reserved_)[a-zA-Z0-9_-]+$/;
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
    all: Joi.array().items(Joi.string()).required(),
    read: Joi.array().items(Joi.string()).required(),
  }).required(),
  ui: Joi.array().items(Joi.string().regex(uiCapabilitiesRegex)).required(),
});

const subFeaturePrivilegeSchema = Joi.object({
  id: Joi.string().regex(subFeaturePrivilegePartRegex).required(),
  name: Joi.string().required(),
  includeIn: Joi.string().allow('all', 'read', 'none').required(),
  management: managementSchema,
  catalogue: catalogueSchema,
  api: Joi.array().items(Joi.string()),
  app: Joi.array().items(Joi.string()),
  savedObject: Joi.object({
    all: Joi.array().items(Joi.string()).required(),
    read: Joi.array().items(Joi.string()).required(),
  }).required(),
  ui: Joi.array().items(Joi.string().regex(uiCapabilitiesRegex)).required(),
});

const subFeatureSchema = Joi.object({
  name: Joi.string().required(),
  privilegeGroups: Joi.array().items(
    Joi.object({
      groupType: Joi.string().valid('mutually_exclusive', 'independent').required(),
      privileges: Joi.array().items(subFeaturePrivilegeSchema).min(1),
    })
  ),
});

const schema = Joi.object({
  id: Joi.string()
    .regex(featurePrivilegePartRegex)
    .invalid(...prohibitedFeatureIds)
    .required(),
  name: Joi.string().required(),
  order: Joi.number(),
  excludeFromBasePrivileges: Joi.boolean(),
  validLicenses: Joi.array().items(
    Joi.string().valid('basic', 'standard', 'gold', 'platinum', 'enterprise', 'trial')
  ),
  icon: Joi.string(),
  description: Joi.string(),
  navLinkId: Joi.string().regex(uiCapabilitiesRegex),
  app: Joi.array().items(Joi.string()).required(),
  management: managementSchema,
  catalogue: catalogueSchema,
  privileges: Joi.object({
    all: privilegeSchema,
    read: privilegeSchema,
  })
    .allow(null)
    .required(),
  subFeatures: Joi.when('privileges', {
    is: null,
    then: Joi.array().items(subFeatureSchema).max(0),
    otherwise: Joi.array().items(subFeatureSchema),
  }),
  privilegesTooltip: Joi.string(),
  reserved: Joi.object({
    description: Joi.string().required(),
    privileges: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().regex(reservedFeaturePrrivilegePartRegex).required(),
          privilege: privilegeSchema.required(),
        })
      )
      .required(),
  }),
});

export function validateFeature(feature: FeatureConfig) {
  const validateResult = Joi.validate(feature, schema);
  if (validateResult.error) {
    throw validateResult.error;
  }
  // the following validation can't be enforced by the Joi schema, since it'd require us looking "up" the object graph for the list of valid value, which they explicitly forbid.
  const { app = [], management = {}, catalogue = [] } = feature;

  const unseenApps = new Set(app);

  const managementSets = Object.entries(management).map((entry) => [
    entry[0],
    new Set(entry[1]),
  ]) as Array<[string, Set<string>]>;

  const unseenManagement = new Map<string, Set<string>>(managementSets);

  const unseenCatalogue = new Set(catalogue);

  function validateAppEntry(privilegeId: string, entry: readonly string[] = []) {
    entry.forEach((privilegeApp) => unseenApps.delete(privilegeApp));

    const unknownAppEntries = difference(entry, app);
    if (unknownAppEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown app entries: ${unknownAppEntries.join(', ')}`
      );
    }
  }

  function validateCatalogueEntry(privilegeId: string, entry: readonly string[] = []) {
    entry.forEach((privilegeCatalogue) => unseenCatalogue.delete(privilegeCatalogue));

    const unknownCatalogueEntries = difference(entry || [], catalogue);
    if (unknownCatalogueEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown catalogue entries: ${unknownCatalogueEntries.join(', ')}`
      );
    }
  }

  function validateManagementEntry(
    privilegeId: string,
    managementEntry: Record<string, readonly string[]> = {}
  ) {
    Object.entries(managementEntry).forEach(([managementSectionId, managementSectionEntry]) => {
      if (unseenManagement.has(managementSectionId)) {
        managementSectionEntry.forEach((entry) => {
          unseenManagement.get(managementSectionId)!.delete(entry);
          if (unseenManagement.get(managementSectionId)?.size === 0) {
            unseenManagement.delete(managementSectionId);
          }
        });
      }
      if (!management[managementSectionId]) {
        throw new Error(
          `Feature privilege ${feature.id}.${privilegeId} has unknown management section: ${managementSectionId}`
        );
      }

      const unknownSectionEntries = difference(
        managementSectionEntry,
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
    });
  }

  const privilegeEntries: Array<[string, FeatureKibanaPrivileges]> = [];
  if (feature.privileges) {
    privilegeEntries.push(...Object.entries(feature.privileges));
  }
  if (feature.reserved) {
    feature.reserved.privileges.forEach((reservedPrivilege) => {
      privilegeEntries.push([reservedPrivilege.id, reservedPrivilege.privilege]);
    });
  }

  if (privilegeEntries.length === 0) {
    return;
  }

  privilegeEntries.forEach(([privilegeId, privilegeDefinition]) => {
    if (!privilegeDefinition) {
      throw new Error('Privilege definition may not be null or undefined');
    }

    validateAppEntry(privilegeId, privilegeDefinition.app);

    validateCatalogueEntry(privilegeId, privilegeDefinition.catalogue);

    validateManagementEntry(privilegeId, privilegeDefinition.management);
  });

  const subFeatureEntries = feature.subFeatures ?? [];
  subFeatureEntries.forEach((subFeature) => {
    subFeature.privilegeGroups.forEach((subFeaturePrivilegeGroup) => {
      subFeaturePrivilegeGroup.privileges.forEach((subFeaturePrivilege) => {
        validateAppEntry(subFeaturePrivilege.id, subFeaturePrivilege.app);
        validateCatalogueEntry(subFeaturePrivilege.id, subFeaturePrivilege.catalogue);
        validateManagementEntry(subFeaturePrivilege.id, subFeaturePrivilege.management);
      });
    });
  });

  if (unseenApps.size > 0) {
    throw new Error(
      `Feature ${
        feature.id
      } specifies app entries which are not granted to any privileges: ${Array.from(
        unseenApps.values()
      ).join(',')}`
    );
  }

  if (unseenCatalogue.size > 0) {
    throw new Error(
      `Feature ${
        feature.id
      } specifies catalogue entries which are not granted to any privileges: ${Array.from(
        unseenCatalogue.values()
      ).join(',')}`
    );
  }

  if (unseenManagement.size > 0) {
    const ungrantedManagement = Array.from(unseenManagement.entries()).reduce((acc, entry) => {
      const values = Array.from(entry[1].values()).map(
        (managementPage) => `${entry[0]}.${managementPage}`
      );
      return [...acc, ...values];
    }, [] as string[]);

    throw new Error(
      `Feature ${
        feature.id
      } specifies management entries which are not granted to any privileges: ${ungrantedManagement.join(
        ','
      )}`
    );
  }
}
