/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { StartServicesAccessor } from 'src/core/public';
import { ManagementSetup, ManagementApp } from '../../../../../src/plugins/management/public';
import { SpacesManager } from '../spaces_manager';
import { PluginsStart } from '../plugin';
import { spacesManagementApp } from './spaces_management_app';

interface SetupDeps {
  management: ManagementSetup;
  getStartServices: StartServicesAccessor<PluginsStart>;
  spacesManager: SpacesManager;
}

export class ManagementService {
  private registeredSpacesManagementApp?: ManagementApp;

  public setup({ getStartServices, management, spacesManager }: SetupDeps) {
    this.registeredSpacesManagementApp = management.sections.section.kibana.registerApp(
      spacesManagementApp.create({ getStartServices, spacesManager })
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
