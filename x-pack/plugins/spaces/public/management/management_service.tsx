/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ManagementSetup, ManagementSection } from 'src/plugins/management/public';
import { CoreSetup } from 'src/core/public';
import { SecurityPluginSetup } from '../../../security/public';
import { SpacesManager } from '../spaces_manager';
import { PluginsStart } from '../plugin';
import { spacesManagementApp } from './spaces_management_app';

interface SetupDeps {
  management: ManagementSetup;
  getStartServices: CoreSetup<PluginsStart>['getStartServices'];
  spacesManager: SpacesManager;
  securityLicense?: SecurityPluginSetup['license'];
}
export class ManagementService {
  private kibanaSection?: ManagementSection;

  public setup({ getStartServices, management, spacesManager, securityLicense }: SetupDeps) {
    this.kibanaSection = management.sections.getSection('kibana');
    if (this.kibanaSection) {
      this.kibanaSection.registerApp(
        spacesManagementApp.create({ getStartServices, spacesManager, securityLicense })
      );
    }
  }

  public start() {}

  public stop() {
    if (this.kibanaSection) {
      const spacesApp = this.kibanaSection.getApp(spacesManagementApp.id);
      if (spacesApp) {
        spacesApp.disable();
      }
    }
  }
}
