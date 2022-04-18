/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CustomIntegration } from '@kbn/custom-integrations-plugin/common';
import { filterCustomIntegrations } from '@kbn/custom-integrations-plugin/public';

import type { PackageListItem } from '../../../../common/types/models';
import { FLEET_APM_PACKAGE } from '../../../../common/constants';

// Export this as a utility to find replacements for a package (e.g. in the overview-page for an EPR package)
function findReplacementsForEprPackage(
  replacements: CustomIntegration[],
  packageName: string,
  release: 'beta' | 'experimental' | 'ga'
): CustomIntegration[] {
  if (release === 'ga') {
    return [];
  }
  return filterCustomIntegrations(replacements, { eprPackageName: packageName });
}

export function useMergeEprPackagesWithReplacements(
  rawEprPackages: PackageListItem[],
  replacements: CustomIntegration[]
): Array<PackageListItem | CustomIntegration> {
  const merged: Array<PackageListItem | CustomIntegration> = [];
  const filteredReplacements = replacements;

  // APM EPR-packages should _never_ show. They have special handling.
  const eprPackages = rawEprPackages.filter((p) => {
    return p.name !== FLEET_APM_PACKAGE;
  });

  // Either select replacement or select beat
  eprPackages.forEach((eprPackage: PackageListItem) => {
    const hits = findReplacementsForEprPackage(
      filteredReplacements,
      eprPackage.name,
      eprPackage.release
    );
    if (hits.length) {
      hits.forEach((hit) => {
        const match = merged.find(({ id }) => {
          return id === hit.id;
        });
        if (!match) {
          merged.push(hit);
        }
      });
    } else {
      merged.push(eprPackage);
    }
  });

  // Add unused replacements
  // This is an edge-case. E.g. the Oracle-beat did not have an Epr-equivalent at the time of writing
  const unusedReplacements = filteredReplacements.filter((integration) => {
    return !eprPackages.find((eprPackage) => {
      return eprPackage.name === integration.eprOverlap;
    });
  });

  merged.push(...unusedReplacements);

  return merged;
}
