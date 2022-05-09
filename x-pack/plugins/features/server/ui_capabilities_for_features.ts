/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type { RecursiveReadonly, Writable } from '@kbn/utility-types';
import { Capabilities as UICapabilities } from '@kbn/core/server';
import { ElasticsearchFeature, KibanaFeature } from '../common';

const ELIGIBLE_FLAT_MERGE_KEYS = ['catalogue'] as const;
const ELIGIBLE_DEEP_MERGE_KEYS = ['management'] as const;

interface FeatureCapabilities {
  [featureId: string]: Record<string, boolean>;
}

export function uiCapabilitiesForFeatures(
  kibanaFeatures: KibanaFeature[],
  elasticsearchFeatures: ElasticsearchFeature[]
): UICapabilities {
  const kibanaFeatureCapabilities = kibanaFeatures.map(getCapabilitiesFromFeature);
  const elasticsearchFeatureCapabilities = elasticsearchFeatures.map(getCapabilitiesFromFeature);

  return buildCapabilities(...kibanaFeatureCapabilities, ...elasticsearchFeatureCapabilities);
}

function getCapabilitiesFromFeature(
  feature:
    | Pick<
        KibanaFeature,
        'id' | 'catalogue' | 'management' | 'privileges' | 'subFeatures' | 'reserved'
      >
    | Pick<ElasticsearchFeature, 'id' | 'catalogue' | 'management' | 'privileges'>
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

  const featurePrivileges = Object.values(feature.privileges ?? {}) as Writable<
    Array<{ ui: RecursiveReadonly<string[]> }>
  >;

  if (isKibanaFeature(feature)) {
    if (feature.subFeatures) {
      featurePrivileges.push(
        ...feature.subFeatures.map((sf) => sf.privilegeGroups.map((pg) => pg.privileges)).flat(2)
      );
    }
    if (feature.reserved?.privileges) {
      featurePrivileges.push(...feature.reserved.privileges.map((rp) => rp.privilege));
    }
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

function isKibanaFeature(
  feature: Partial<KibanaFeature> | Partial<ElasticsearchFeature>
): feature is KibanaFeature {
  // Elasticsearch features define privileges as an array,
  // whereas Kibana features define privileges as an object,
  // or they define reserved privileges, or they don't define either.
  // Elasticsearch features are required to defined privileges.
  return (
    (feature as any).reserved != null ||
    (feature.privileges && !Array.isArray(feature.privileges)) ||
    feature.privileges === null
  );
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
