/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup, CoreStart, AppMountParameters } from '@kbn/core/public';
import { CasesPublicSetup, CasesPublicStart } from '@kbn/cases-plugin/public/types';
import { LensPublicStart } from '@kbn/lens-plugin/public';
import { getExternalReferenceAttachmentRegular } from './attachments/external_reference';
import { getPersistableStateAttachmentRegular } from './attachments/persistable_state';

export type Setup = void;
export type Start = void;

export interface CasesExamplePublicSetupDeps {
  cases: CasesPublicSetup;
}

export interface CasesExamplePublicStartDeps {
  lens: LensPublicStart;
  cases: CasesPublicStart;
}

export class CasesFixturePlugin
  implements Plugin<Setup, Start, CasesExamplePublicSetupDeps, CasesExamplePublicStartDeps>
{
  public setup(core: CoreSetup<CasesExamplePublicStartDeps>, plugins: CasesExamplePublicSetupDeps) {
    plugins.cases.attachmentFramework.registerExternalReference(
      getExternalReferenceAttachmentRegular()
    );

    core.getStartServices().then(([_, depsStart]) => {
      plugins.cases.attachmentFramework.registerPersistableState(
        getPersistableStateAttachmentRegular(depsStart.lens.EmbeddableComponent)
      );
    });

    core.application.register({
      id: 'cases_fixture',
      title: 'Cases Fixture App',
      async mount(params: AppMountParameters) {
        const [coreStart, pluginsStart] = await core.getStartServices();
        const { renderApp } = await import('./application');
        return renderApp({ coreStart, pluginsStart, mountParams: params });
      },
    });
  }

  public start(core: CoreStart, plugins: CasesExamplePublicStartDeps) {}

  public stop() {}
}
