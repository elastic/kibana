/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep, uniq } from 'lodash';
import { ILicense } from '@kbn/licensing-plugin/server';
import { DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import {
  KibanaFeatureConfig,
  KibanaFeature,
  FeatureKibanaPrivileges,
  ElasticsearchFeatureConfig,
  ElasticsearchFeature,
  SubFeaturePrivilegeConfig,
  KibanaFeatureScope,
} from '../common';
import { validateKibanaFeature, validateElasticsearchFeature } from './feature_schema';
import type { ConfigOverridesType } from './config';

export class FeatureRegistry {
  private locked = false;
  private kibanaFeatures: Record<string, KibanaFeatureConfig> = {};
  private esFeatures: Record<string, ElasticsearchFeatureConfig> = {};

  public lockRegistration() {
    this.locked = true;
  }

  public registerKibanaFeature(feature: KibanaFeatureConfig) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    validateKibanaFeature(feature);

    if (feature.id in this.kibanaFeatures || feature.id in this.esFeatures) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    if (!feature.scope) {
      feature.scope = [KibanaFeatureScope.Security];
    }

    const featureCopy = cloneDeep(feature);

    this.kibanaFeatures[feature.id] = applyAutomaticPrivilegeGrants(featureCopy);
  }

  public registerElasticsearchFeature(feature: ElasticsearchFeatureConfig) {
    if (this.locked) {
      throw new Error(
        `Features are locked, can't register new features. Attempt to register ${feature.id} failed.`
      );
    }

    if (feature.id in this.kibanaFeatures || feature.id in this.esFeatures) {
      throw new Error(`Feature with id ${feature.id} is already registered.`);
    }

    validateElasticsearchFeature(feature);

    const featureCopy = cloneDeep(feature);

    this.esFeatures[feature.id] = featureCopy;
  }

  /**
   * Updates definitions for the registered features using configuration overrides, if any.
   */
  public applyOverrides(overrides: ConfigOverridesType) {
    for (const [featureId, featureOverride] of Object.entries(overrides)) {
      const feature = this.kibanaFeatures[featureId];
      if (!feature) {
        throw new Error(
          `Cannot override feature "${featureId}" since feature with such ID is not registered.`
        );
      }

      if (featureOverride.hidden) {
        feature.hidden = featureOverride.hidden;
      }

      // Note that the name doesn't currently support localizable strings. We'll revisit this approach when i18n support
      // becomes necessary.
      if (featureOverride.name) {
        feature.name = featureOverride.name;
      }

      if (featureOverride.category) {
        feature.category = DEFAULT_APP_CATEGORIES[featureOverride.category];
      }

      if (featureOverride.order != null) {
        feature.order = featureOverride.order;
      }

      if (featureOverride.privileges) {
        for (const [privilegeId, privilegeOverride] of Object.entries(featureOverride.privileges)) {
          const typedPrivilegeId = privilegeId as 'read' | 'all';
          const targetPrivilege = feature.privileges?.[typedPrivilegeId];
          if (!targetPrivilege) {
            throw new Error(
              `Cannot override privilege "${privilegeId}" of feature "${featureId}" since "${privilegeId}" privilege is not registered.`
            );
          }

          for (const featureReference of privilegeOverride.composedOf ?? []) {
            const referencedFeature = this.kibanaFeatures[featureReference.feature];
            if (!referencedFeature) {
              throw new Error(
                `Cannot compose privilege "${privilegeId}" of feature "${featureId}" with privileges of feature "${featureReference.feature}" since such feature is not registered.`
              );
            }

            // Collect all known feature and sub-feature privileges for the referenced feature.
            const knownPrivileges = new Map(
              Object.entries(referencedFeature.privileges ?? {}).concat(
                collectSubFeaturesPrivileges(referencedFeature)
              )
            );

            for (const privilegeReference of featureReference.privileges) {
              const referencedPrivilege = knownPrivileges.get(privilegeReference);
              if (!referencedPrivilege) {
                throw new Error(
                  `Cannot compose privilege "${privilegeId}" of feature "${featureId}" with privilege "${privilegeReference}" of feature "${featureReference.feature}" since such privilege is not registered.`
                );
              }
            }
          }

          // It's safe to assume that `feature.privileges` is defined here since we've checked it above.
          feature.privileges![typedPrivilegeId] = { ...targetPrivilege, ...privilegeOverride };
        }
      }

      if (featureOverride.subFeatures?.privileges) {
        // Collect all known sub-feature privileges for the feature.
        const knownPrivileges = new Map(collectSubFeaturesPrivileges(feature));
        if (knownPrivileges.size === 0) {
          throw new Error(
            `Cannot override sub-feature privileges of feature "${featureId}" since it didn't register any.`
          );
        }

        for (const [privilegeId, privilegeOverride] of Object.entries(
          featureOverride.subFeatures.privileges
        )) {
          const targetPrivilege = knownPrivileges.get(privilegeId);
          if (!targetPrivilege) {
            throw new Error(
              `Cannot override sub-feature privilege "${privilegeId}" of feature "${featureId}" since "${privilegeId}" sub-feature privilege is not registered. Known sub-feature privileges are: ${Array.from(
                knownPrivileges.keys()
              )}.`
            );
          }

          targetPrivilege.disabled = privilegeOverride.disabled;
          if (privilegeOverride.includeIn) {
            targetPrivilege.includeIn = privilegeOverride.includeIn;
          }
        }
      }
    }
  }

  public getAllKibanaFeatures(license?: ILicense, ignoreLicense = false): KibanaFeature[] {
    if (!this.locked) {
      throw new Error('Cannot retrieve Kibana features while registration is still open');
    }

    let features = Object.values(this.kibanaFeatures);

    const performLicenseCheck = license && !ignoreLicense;

    if (performLicenseCheck) {
      features = features.filter((feature) => {
        const filter = !feature.minimumLicense || license!.hasAtLeast(feature.minimumLicense);
        if (!filter) return false;

        feature.subFeatures?.forEach((subFeature) => {
          subFeature.privilegeGroups.forEach((group) => {
            group.privileges = group.privileges.filter(
              (privilege) =>
                !privilege.minimumLicense || license!.hasAtLeast(privilege.minimumLicense)
            );
          });
        });

        return true;
      });
    }
    return features.map((featureConfig) => new KibanaFeature(featureConfig));
  }

  public getAllElasticsearchFeatures(): ElasticsearchFeature[] {
    if (!this.locked) {
      throw new Error('Cannot retrieve elasticsearch features while registration is still open');
    }

    return Object.values(this.esFeatures).map(
      (featureConfig) => new ElasticsearchFeature(featureConfig)
    );
  }
}

function applyAutomaticPrivilegeGrants(feature: KibanaFeatureConfig): KibanaFeatureConfig {
  const allPrivilege = feature.privileges?.all;
  const readPrivilege = feature.privileges?.read;
  const reservedPrivileges = (feature.reserved?.privileges ?? []).map((rp) => rp.privilege);

  applyAutomaticAllPrivilegeGrants(allPrivilege, ...reservedPrivileges);
  applyAutomaticReadPrivilegeGrants(readPrivilege);

  return feature;
}

function applyAutomaticAllPrivilegeGrants(
  ...allPrivileges: Array<FeatureKibanaPrivileges | undefined>
) {
  allPrivileges.forEach((allPrivilege) => {
    if (allPrivilege) {
      allPrivilege.savedObject.all = uniq([...allPrivilege.savedObject.all, 'telemetry']);
      allPrivilege.savedObject.read = uniq([
        ...allPrivilege.savedObject.read,
        'config',
        'config-global',
        'url',
      ]);
    }
  });
}

function applyAutomaticReadPrivilegeGrants(
  ...readPrivileges: Array<FeatureKibanaPrivileges | undefined>
) {
  readPrivileges.forEach((readPrivilege) => {
    if (readPrivilege) {
      readPrivilege.savedObject.read = uniq([
        ...readPrivilege.savedObject.read,
        'config',
        'config-global',
        'telemetry',
        'url',
      ]);
    }
  });
}

function collectSubFeaturesPrivileges(feature: KibanaFeatureConfig) {
  return (
    feature.subFeatures?.flatMap((subFeature) =>
      subFeature.privilegeGroups.flatMap(({ privileges }) =>
        privileges.map(
          (privilege) => [privilege.id, privilege] as [string, SubFeaturePrivilegeConfig]
        )
      )
    ) ?? []
  );
}
