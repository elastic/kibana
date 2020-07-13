/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import _ from 'lodash';
import { Capabilities, CapabilitiesSwitcher, CoreSetup, Logger } from 'src/core/server';
import { Feature } from '../../../../plugins/features/server';
import { Space } from '../../common/model/space';
import { SpacesServiceSetup } from '../spaces_service';
import { PluginsStart } from '../plugin';

export function setupCapabilitiesSwitcher(
  core: CoreSetup<PluginsStart>,
  spacesService: SpacesServiceSetup,
  logger: Logger
): CapabilitiesSwitcher {
  return async (request, capabilities) => {
    const isAnonymousRequest = !request.route.options.authRequired;

    if (isAnonymousRequest) {
      return capabilities;
    }

    try {
      const [activeSpace, [, { features }]] = await Promise.all([
        spacesService.getActiveSpace(request),
        core.getStartServices(),
      ]);

      const registeredFeatures = features.getFeatures();

      // try to retrieve capabilities for authenticated or "maybe authenticated" users
      return toggleCapabilities(registeredFeatures, capabilities, activeSpace);
    } catch (e) {
      logger.debug(`Error toggling capabilities for request to ${request.url.pathname}: ${e}`);
      return capabilities;
    }
  };
}

function toggleCapabilities(features: Feature[], capabilities: Capabilities, activeSpace: Space) {
  const clonedCapabilities = _.cloneDeep(capabilities);

  toggleDisabledFeatures(features, clonedCapabilities, activeSpace);

  return clonedCapabilities;
}

function toggleDisabledFeatures(
  features: Feature[],
  capabilities: Capabilities,
  activeSpace: Space
) {
  const disabledFeatureKeys = activeSpace.disabledFeatures;

  const [enabledFeatures, disabledFeatures] = features.reduce(
    (acc, feature) => {
      if (disabledFeatureKeys.includes(feature.id)) {
        return [acc[0], [...acc[1], feature]];
      }
      return [[...acc[0], feature], acc[1]];
    },
    [[], []] as [Feature[], Feature[]]
  );

  const navLinks = capabilities.navLinks;
  const catalogueEntries = capabilities.catalogue;
  const managementItems = capabilities.management;

  const enabledAppEntries = new Set(enabledFeatures.flatMap((ef) => ef.app ?? []));
  const enabledCatalogueEntries = new Set(enabledFeatures.flatMap((ef) => ef.catalogue ?? []));
  const enabledManagementEntries = enabledFeatures.reduce((acc, feature) => {
    const sections = Object.entries(feature.management ?? {});
    sections.forEach((section) => {
      if (!acc.has(section[0])) {
        acc.set(section[0], []);
      }
      acc.get(section[0])!.push(...section[1]);
    });
    return acc;
  }, new Map<string, string[]>());

  for (const feature of disabledFeatures) {
    // Disable associated navLink, if one exists
    const featureNavLinks = feature.navLinkId ? [feature.navLinkId, ...feature.app] : feature.app;
    featureNavLinks.forEach((app) => {
      if (navLinks.hasOwnProperty(app) && !enabledAppEntries.has(app)) {
        navLinks[app] = false;
      }
    });

    // Disable associated catalogue entries
    const privilegeCatalogueEntries = feature.catalogue || [];
    privilegeCatalogueEntries.forEach((catalogueEntryId) => {
      if (!enabledCatalogueEntries.has(catalogueEntryId)) {
        catalogueEntries[catalogueEntryId] = false;
      }
    });

    // Disable associated management items
    const privilegeManagementSections = feature.management || {};
    Object.entries(privilegeManagementSections).forEach(([sectionId, sectionItems]) => {
      sectionItems.forEach((item) => {
        const enabledManagementEntriesSection = enabledManagementEntries.get(sectionId);
        if (
          managementItems.hasOwnProperty(sectionId) &&
          managementItems[sectionId].hasOwnProperty(item)
        ) {
          const isEnabledElsewhere = (enabledManagementEntriesSection ?? []).includes(item);
          if (!isEnabledElsewhere) {
            managementItems[sectionId][item] = false;
          }
        }
      });
    });

    // Disable "sub features" that match the disabled feature
    if (capabilities.hasOwnProperty(feature.id)) {
      const capability = capabilities[feature.id];
      Object.keys(capability).forEach((featureKey) => {
        capability[featureKey] = false;
      });
    }
  }
}
