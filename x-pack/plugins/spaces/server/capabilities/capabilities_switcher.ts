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

  const disabledFeatures = disabledFeatureKeys
    .map((key) => features.find((feature) => feature.id === key))
    .filter((feature) => typeof feature !== 'undefined') as Feature[];

  const navLinks = capabilities.navLinks;
  const catalogueEntries = capabilities.catalogue;
  const managementItems = capabilities.management;

  for (const feature of disabledFeatures) {
    // Disable associated navLink, if one exists
    if (feature.navLinkId && navLinks.hasOwnProperty(feature.navLinkId)) {
      navLinks[feature.navLinkId] = false;
    }

    feature.app.forEach((app) => {
      if (navLinks.hasOwnProperty(app)) {
        navLinks[app] = false;
      }
    });

    // Disable associated catalogue entries
    const privilegeCatalogueEntries = feature.catalogue || [];
    privilegeCatalogueEntries.forEach((catalogueEntryId) => {
      catalogueEntries[catalogueEntryId] = false;
    });

    // Disable associated management items
    const privilegeManagementSections = feature.management || {};
    Object.entries(privilegeManagementSections).forEach(([sectionId, sectionItems]) => {
      sectionItems.forEach((item) => {
        if (
          managementItems.hasOwnProperty(sectionId) &&
          managementItems[sectionId].hasOwnProperty(item)
        ) {
          managementItems[sectionId][item] = false;
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
