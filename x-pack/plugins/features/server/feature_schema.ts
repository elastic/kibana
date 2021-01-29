/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Joi from 'joi';

import { difference } from 'lodash';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { KibanaFeatureConfig } from '../common';
import { FeatureKibanaPrivileges, ElasticsearchFeatureConfig } from '.';

// Each feature gets its own property on the UICapabilities object,
// but that object has a few built-in properties which should not be overwritten.
const prohibitedFeatureIds: Array<keyof UICapabilities> = ['catalogue', 'management', 'navLinks'];

const featurePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const subFeaturePrivilegePartRegex = /^[a-zA-Z0-9_-]+$/;
const managementSectionIdRegex = /^[a-zA-Z0-9_-]+$/;
const reservedFeaturePrrivilegePartRegex = /^(?!reserved_)[a-zA-Z0-9_-]+$/;
export const uiCapabilitiesRegex = /^[a-zA-Z0-9:_-]+$/;

const validLicenses = ['basic', 'standard', 'gold', 'platinum', 'enterprise', 'trial'];
// sub-feature privileges are only available with a `gold` license or better, so restricting sub-feature privileges
// for `gold` or below doesn't make a whole lot of sense.
const validSubFeaturePrivilegeLicenses = ['platinum', 'enterprise', 'trial'];

const managementSchema = Joi.object().pattern(
  managementSectionIdRegex,
  Joi.array().items(Joi.string().regex(uiCapabilitiesRegex))
);
const catalogueSchema = Joi.array().items(Joi.string().regex(uiCapabilitiesRegex));
const alertingSchema = Joi.array().items(Joi.string());

const appCategorySchema = Joi.object({
  id: Joi.string().required(),
  label: Joi.string().required(),
  ariaLabel: Joi.string(),
  euiIconType: Joi.string(),
  order: Joi.number(),
}).required();

const kibanaPrivilegeSchema = Joi.object({
  excludeFromBasePrivileges: Joi.boolean(),
  management: managementSchema,
  catalogue: catalogueSchema,
  api: Joi.array().items(Joi.string()),
  app: Joi.array().items(Joi.string()),
  alerting: Joi.object({
    all: alertingSchema,
    read: alertingSchema,
  }),
  savedObject: Joi.object({
    all: Joi.array().items(Joi.string()).required(),
    read: Joi.array().items(Joi.string()).required(),
  }).required(),
  ui: Joi.array().items(Joi.string().regex(uiCapabilitiesRegex)).required(),
});

const kibanaIndependentSubFeaturePrivilegeSchema = Joi.object({
  id: Joi.string().regex(subFeaturePrivilegePartRegex).required(),
  name: Joi.string().required(),
  includeIn: Joi.string().allow('all', 'read', 'none').required(),
  minimumLicense: Joi.string().valid(...validSubFeaturePrivilegeLicenses),
  management: managementSchema,
  catalogue: catalogueSchema,
  alerting: Joi.object({
    all: alertingSchema,
    read: alertingSchema,
  }),
  api: Joi.array().items(Joi.string()),
  app: Joi.array().items(Joi.string()),
  savedObject: Joi.object({
    all: Joi.array().items(Joi.string()).required(),
    read: Joi.array().items(Joi.string()).required(),
  }).required(),
  ui: Joi.array().items(Joi.string().regex(uiCapabilitiesRegex)).required(),
});

const kibanaMutuallyExclusiveSubFeaturePrivilegeSchema = kibanaIndependentSubFeaturePrivilegeSchema.keys(
  {
    minimumLicense: Joi.forbidden(),
  }
);

const kibanaSubFeatureSchema = Joi.object({
  name: Joi.string().required(),
  privilegeGroups: Joi.array().items(
    Joi.object({
      groupType: Joi.string().valid('mutually_exclusive', 'independent').required(),
      privileges: Joi.when('groupType', {
        is: 'mutually_exclusive',
        then: Joi.array().items(kibanaMutuallyExclusiveSubFeaturePrivilegeSchema).min(1),
        otherwise: Joi.array().items(kibanaIndependentSubFeaturePrivilegeSchema).min(1),
      }),
    })
  ),
});

const kibanaFeatureSchema = Joi.object({
  id: Joi.string()
    .regex(featurePrivilegePartRegex)
    .invalid(...prohibitedFeatureIds)
    .required(),
  name: Joi.string().required(),
  category: appCategorySchema,
  order: Joi.number(),
  excludeFromBasePrivileges: Joi.boolean(),
  minimumLicense: Joi.string().valid(...validLicenses),
  app: Joi.array().items(Joi.string()).required(),
  management: managementSchema,
  catalogue: catalogueSchema,
  alerting: alertingSchema,
  privileges: Joi.object({
    all: kibanaPrivilegeSchema,
    read: kibanaPrivilegeSchema,
  })
    .allow(null)
    .required(),
  subFeatures: Joi.when('privileges', {
    is: null,
    then: Joi.array().items(kibanaSubFeatureSchema).max(0),
    otherwise: Joi.array().items(kibanaSubFeatureSchema),
  }),
  privilegesTooltip: Joi.string(),
  reserved: Joi.object({
    description: Joi.string().required(),
    privileges: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().regex(reservedFeaturePrrivilegePartRegex).required(),
          privilege: kibanaPrivilegeSchema.required(),
        })
      )
      .required(),
  }),
});

const elasticsearchPrivilegeSchema = Joi.object({
  ui: Joi.array().items(Joi.string()).required(),
  requiredClusterPrivileges: Joi.array().items(Joi.string()),
  requiredIndexPrivileges: Joi.object().pattern(Joi.string(), Joi.array().items(Joi.string())),
  requiredRoles: Joi.array().items(Joi.string()),
});

const elasticsearchFeatureSchema = Joi.object({
  id: Joi.string()
    .regex(featurePrivilegePartRegex)
    .invalid(...prohibitedFeatureIds)
    .required(),
  management: managementSchema,
  catalogue: catalogueSchema,
  privileges: Joi.array().items(elasticsearchPrivilegeSchema).required(),
});

export function validateKibanaFeature(feature: KibanaFeatureConfig) {
  const validateResult = Joi.validate(feature, kibanaFeatureSchema);
  if (validateResult.error) {
    throw validateResult.error;
  }
  // the following validation can't be enforced by the Joi schema, since it'd require us looking "up" the object graph for the list of valid value, which they explicitly forbid.
  const { app = [], management = {}, catalogue = [], alerting = [] } = feature;

  const unseenApps = new Set(app);

  const managementSets = Object.entries(management).map((entry) => [
    entry[0],
    new Set(entry[1]),
  ]) as Array<[string, Set<string>]>;

  const unseenManagement = new Map<string, Set<string>>(managementSets);

  const unseenCatalogue = new Set(catalogue);

  const unseenAlertTypes = new Set(alerting);

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

  function validateAlertingEntry(privilegeId: string, entry: FeatureKibanaPrivileges['alerting']) {
    const all = entry?.all ?? [];
    const read = entry?.read ?? [];

    all.forEach((privilegeAlertTypes) => unseenAlertTypes.delete(privilegeAlertTypes));
    read.forEach((privilegeAlertTypes) => unseenAlertTypes.delete(privilegeAlertTypes));

    const unknownAlertingEntries = difference([...all, ...read], alerting);
    if (unknownAlertingEntries.length > 0) {
      throw new Error(
        `Feature privilege ${
          feature.id
        }.${privilegeId} has unknown alerting entries: ${unknownAlertingEntries.join(', ')}`
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
    validateAlertingEntry(privilegeId, privilegeDefinition.alerting);
  });

  const subFeatureEntries = feature.subFeatures ?? [];
  subFeatureEntries.forEach((subFeature) => {
    subFeature.privilegeGroups.forEach((subFeaturePrivilegeGroup) => {
      subFeaturePrivilegeGroup.privileges.forEach((subFeaturePrivilege) => {
        validateAppEntry(subFeaturePrivilege.id, subFeaturePrivilege.app);
        validateCatalogueEntry(subFeaturePrivilege.id, subFeaturePrivilege.catalogue);
        validateManagementEntry(subFeaturePrivilege.id, subFeaturePrivilege.management);
        validateAlertingEntry(subFeaturePrivilege.id, subFeaturePrivilege.alerting);
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

  if (unseenAlertTypes.size > 0) {
    throw new Error(
      `Feature ${
        feature.id
      } specifies alerting entries which are not granted to any privileges: ${Array.from(
        unseenAlertTypes.values()
      ).join(',')}`
    );
  }
}

export function validateElasticsearchFeature(feature: ElasticsearchFeatureConfig) {
  const validateResult = Joi.validate(feature, elasticsearchFeatureSchema);
  if (validateResult.error) {
    throw validateResult.error;
  }
  // the following validation can't be enforced by the Joi schema without a very convoluted and verbose definition
  const { privileges } = feature;
  privileges.forEach((privilege, index) => {
    const {
      requiredClusterPrivileges = [],
      requiredIndexPrivileges = [],
      requiredRoles = [],
    } = privilege;

    if (
      requiredClusterPrivileges.length === 0 &&
      requiredIndexPrivileges.length === 0 &&
      requiredRoles.length === 0
    ) {
      throw new Error(
        `Feature ${feature.id} has a privilege definition at index ${index} without any privileges defined.`
      );
    }
  });
}
