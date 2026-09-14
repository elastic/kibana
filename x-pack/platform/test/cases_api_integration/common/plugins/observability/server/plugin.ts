/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Plugin, CoreSetup } from '@kbn/core/server';
import { hiddenTypes as filesSavedObjectTypes } from '@kbn/files-plugin/server/saved_objects';
import type { FeaturesPluginSetup } from '@kbn/features-plugin/server';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/server';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import type { CasesServerSetup } from '@kbn/cases-plugin/server';

export interface FixtureSetupDeps {
  features: FeaturesPluginSetup;
  cases: CasesServerSetup;
}

export interface FixtureStartDeps {
  security?: SecurityPluginStart;
  spaces?: SpacesPluginStart;
}

export class FixturePlugin implements Plugin<void, void, FixtureSetupDeps, FixtureStartDeps> {
  public setup(core: CoreSetup<FixtureStartDeps>, deps: FixtureSetupDeps) {
    const { features, cases } = deps;
    // Behave like the observability owner so unified alert/event attachments
    // resolve to `observability.*` types once the attachments feature flag is on.
    cases.registerOwnerPrefix('observabilityFixture', 'observability');
    features.registerKibanaFeature({
      id: 'observabilityFixture',
      name: 'ObservabilityFixture',
      app: ['kibana'],
      category: { id: 'cases-fixtures', label: 'Cases Fixtures' },
      cases: ['observabilityFixture'],
      privileges: {
        all: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles', 'casesGetConnectorsConfigure'],
          app: ['kibana'],
          cases: {
            all: ['observabilityFixture'],
          },
          savedObject: {
            all: [...filesSavedObjectTypes],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
        read: {
          api: ['casesSuggestUserProfiles', 'bulkGetUserProfiles', 'casesGetConnectorsConfigure'],
          app: ['kibana'],
          cases: {
            read: ['observabilityFixture'],
          },
          savedObject: {
            all: [],
            read: [...filesSavedObjectTypes],
          },
          ui: [],
        },
      },
    });
  }
  public start() {}
  public stop() {}
}
