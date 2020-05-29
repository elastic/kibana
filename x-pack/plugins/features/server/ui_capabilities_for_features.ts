/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import _ from 'lodash';
import { Capabilities as UICapabilities } from '../../../../src/core/server';
import { KibanaFeature } from '../common/feature';
import { ElasticsearchFeature } from '../common';

const ELIGIBLE_FLAT_MERGE_KEYS = ['catalogue'] as const;
const ELIGIBLE_DEEP_MERGE_KEYS = ['management'] as const;

interface FeatureCapabilities {
  [featureId: string]: Record<string, boolean>;
}

export function uiCapabilitiesForFeatures(
  features: KibanaFeature[],
  elasticsearchFeatures: ElasticsearchFeature[]
): UICapabilities {
  const featureCapabilities = features.map(getCapabilitiesFromFeature);
  const esFeatureCapabilities = elasticsearchFeatures.map(getCapabilitiesFromElasticsearchFeature);

  return buildCapabilities(...featureCapabilities, ...esFeatureCapabilities);
}

function getCapabilitiesFromFeature(feature: KibanaFeature): FeatureCapabilities {
  const UIFeatureCapabilities: FeatureCapabilities = {
    catalogue: {},
    [feature.id]: {},
  };

  if (feature.catalogue) {
    UIFeatureCapabilities.catalogue = {
      ...UIFeatureCapabilities.catalogue,
      ...feature.catalogue.reduce(
        (acc, capability) => ({
          ...acc,
          [capability]: true,
        }),
        {}
      ),
    };
  }

  if (feature.management) {
    const sectionEntries = Object.entries(feature.management);
    UIFeatureCapabilities.management = sectionEntries.reduce((acc, [sectionId, sectionItems]) => {
      return {
        ...acc,
        [sectionId]: sectionItems.reduce((acc2, item) => {
          return {
            ...acc2,
            [item]: true,
          };
        }, {}),
      };
    }, {});
  }

  const featurePrivileges = Object.values(feature.privileges ?? {});
  if (feature.subFeatures) {
    featurePrivileges.push(
      ...feature.subFeatures.map((sf) => sf.privilegeGroups.map((pg) => pg.privileges)).flat(2)
    );
  }
  if (feature.reserved?.privileges) {
    featurePrivileges.push(...feature.reserved.privileges.map((rp) => rp.privilege));
  }

  featurePrivileges.forEach((privilege) => {
    UIFeatureCapabilities[feature.id] = {
      ...UIFeatureCapabilities[feature.id],
      ...privilege.ui.reduce(
        (privilegeAcc, capability) => ({
          ...privilegeAcc,
          [capability]: true,
        }),
        {}
      ),
    };
  });

  return UIFeatureCapabilities;
}

function getCapabilitiesFromElasticsearchFeature(
  feature: ElasticsearchFeature
): FeatureCapabilities {
  const UIFeatureCapabilities: FeatureCapabilities = {
    catalogue: {},
    [feature.id]: {},
  };

  if (feature.catalogue) {
    UIFeatureCapabilities.catalogue = {
      ...UIFeatureCapabilities.catalogue,
      ...feature.catalogue.reduce(
        (acc, capability) => ({
          ...acc,
          [capability]: true,
        }),
        {}
      ),
    };
  }

  if (feature.management) {
    const sectionEntries = Object.entries(feature.management);
    UIFeatureCapabilities.management = sectionEntries.reduce((acc, [sectionId, sectionItems]) => {
      return {
        ...acc,
        [sectionId]: sectionItems.reduce((acc2, item) => {
          return {
            ...acc2,
            [item]: true,
          };
        }, {}),
      };
    }, {});
  }

  const featurePrivileges = Object.values(feature.privileges ?? {});

  featurePrivileges.forEach((privilege) => {
    UIFeatureCapabilities[feature.id] = {
      ...UIFeatureCapabilities[feature.id],
      ...privilege.ui.reduce(
        (privilegeAcc, capability) => ({
          ...privilegeAcc,
          [capability]: true,
        }),
        {}
      ),
    };
  });

  return UIFeatureCapabilities;
}

function buildCapabilities(...allFeatureCapabilities: FeatureCapabilities[]): UICapabilities {
  return allFeatureCapabilities.reduce<UICapabilities>((acc, capabilities) => {
    const mergableCapabilities = _.omit(capabilities, ...ELIGIBLE_FLAT_MERGE_KEYS);

    const mergedFeatureCapabilities = {
      ...mergableCapabilities,
      ...acc,
    };

    ELIGIBLE_FLAT_MERGE_KEYS.forEach((key) => {
      mergedFeatureCapabilities[key] = {
        ...mergedFeatureCapabilities[key],
        ...capabilities[key],
      };
    });

    ELIGIBLE_DEEP_MERGE_KEYS.forEach((key) => {
      mergedFeatureCapabilities[key] = _.merge(
        {},
        mergedFeatureCapabilities[key],
        capabilities[key]
      );
    });

    return mergedFeatureCapabilities;
  }, {} as UICapabilities);
}
