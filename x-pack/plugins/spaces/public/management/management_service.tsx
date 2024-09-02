/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StartServicesAccessor } from '@kbn/core/public';
import type { ManagementApp, ManagementSetup } from '@kbn/management-plugin/public';
import type {
  PrivilegesAPIClientPublicContract,
  RolesAPIClient,
} from '@kbn/security-plugin-types-public';

import { spacesManagementApp } from './spaces_management_app';
import type { EventTracker } from '../analytics';
import type { ConfigType } from '../config';
import type { PluginsStart } from '../plugin';
import type { SpacesManager } from '../spaces_manager';

interface SetupDeps {
  management: ManagementSetup;
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
  config: ConfigType;
  getRolesAPIClient: () => Promise<RolesAPIClient>;
  eventTracker: EventTracker;
  getPrivilegesAPIClient: () => Promise<PrivilegesAPIClientPublicContract>;
}

export class ManagementService {
  private registeredSpacesManagementApp?: ManagementApp;

  public setup({
    getStartServices,
    management,
    spacesManager,
    config,
    getRolesAPIClient,
    eventTracker,
    getPrivilegesAPIClient,
  }: SetupDeps) {
    this.registeredSpacesManagementApp = management.sections.section.kibana.registerApp(
      spacesManagementApp.create({
        getStartServices,
        spacesManager,
        config,
        getRolesAPIClient,
        eventTracker,
        getPrivilegesAPIClient,
      })
    );
  }

  public stop() {
    this.disableSpacesApp();
  }

  private disableSpacesApp() {
    if (this.registeredSpacesManagementApp) {
      this.registeredSpacesManagementApp.disable();
    }
  }
}
