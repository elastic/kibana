/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type { ManagementAppMountParams } from '@kbn/management-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { CasesUiStart, CasesPluginSetup, CasesPluginStart, CasesUiSetup } from './types';
import { KibanaServices } from './common/lib/kibana';
import type { CasesUiConfigType } from '../common/ui/types';
import { APP_ID, APP_PATH } from '../common/constants';
import { APP_TITLE, APP_DESC } from './common/translations';
import { useCasesAddToExistingCaseModal } from './components/all_cases/selector_modal/use_cases_add_to_existing_case_modal';
import { useCasesAddToNewCaseFlyout } from './components/create/flyout/use_cases_add_to_new_case_flyout';
import { createClientAPI } from './client/api';
import { canUseCases } from './client/helpers/can_use_cases';
import { getRuleIdFromEvent } from './client/helpers/get_rule_id_from_event';
import { getAllCasesSelectorModalLazy } from './client/ui/get_all_cases_selector_modal';
import { getCasesLazy } from './client/ui/get_cases';
import { getCasesContextLazy } from './client/ui/get_cases_context';
import { getCreateCaseFlyoutLazy } from './client/ui/get_create_case_flyout';
import { getRecentCasesLazy } from './client/ui/get_recent_cases';
import { groupAlertsByRule } from './client/helpers/group_alerts_by_rule';
import { getUICapabilities } from './client/helpers/capabilities';
import { ExternalReferenceAttachmentTypeRegistry } from './client/attachment_framework/external_reference_registry';
import { PersistableStateAttachmentTypeRegistry } from './client/attachment_framework/persistable_state_registry';
import { registerCaseFileKinds } from './files';

/**
 * @public
 * A plugin for retrieving Cases UI components
 */
export class CasesUiPlugin
  implements Plugin<void, CasesUiStart, CasesPluginSetup, CasesPluginStart>
{
  private readonly kibanaVersion: string;
  private readonly storage = new Storage(localStorage);
  private externalReferenceAttachmentTypeRegistry: ExternalReferenceAttachmentTypeRegistry;
  private persistableStateAttachmentTypeRegistry: PersistableStateAttachmentTypeRegistry;

  constructor(private readonly initializerContext: PluginInitializerContext) {
    this.kibanaVersion = initializerContext.env.packageInfo.version;
    this.externalReferenceAttachmentTypeRegistry = new ExternalReferenceAttachmentTypeRegistry();
    this.persistableStateAttachmentTypeRegistry = new PersistableStateAttachmentTypeRegistry();
  }

  public setup(core: CoreSetup, plugins: CasesPluginSetup): CasesUiSetup {
    const kibanaVersion = this.kibanaVersion;
    const storage = this.storage;
    const externalReferenceAttachmentTypeRegistry = this.externalReferenceAttachmentTypeRegistry;
    const persistableStateAttachmentTypeRegistry = this.persistableStateAttachmentTypeRegistry;

    registerCaseFileKinds(plugins.files);

    if (plugins.home) {
      plugins.home.featureCatalogue.register({
        id: APP_ID,
        title: APP_TITLE,
        description: APP_DESC,
        icon: 'casesApp',
        path: APP_PATH,
        showOnHomePage: false,
        category: 'admin',
      });
    }

    plugins.management.sections.section.insightsAndAlerting.registerApp({
      id: APP_ID,
      title: APP_TITLE,
      order: 1,
      async mount(params: ManagementAppMountParams) {
        const [coreStart, pluginsStart] = (await core.getStartServices()) as [
          CoreStart,
          CasesPluginStart,
          unknown
        ];

        const { renderApp } = await import('./application');

        return renderApp({
          mountParams: params,
          coreStart,
          pluginsStart,
          storage,
          kibanaVersion,
          externalReferenceAttachmentTypeRegistry,
          persistableStateAttachmentTypeRegistry,
        });
      },
    });

    return {
      attachmentFramework: {
        registerExternalReference: (externalReferenceAttachmentType) => {
          this.externalReferenceAttachmentTypeRegistry.register(externalReferenceAttachmentType);
        },
        registerPersistableState: (persistableStateAttachmentType) => {
          this.persistableStateAttachmentTypeRegistry.register(persistableStateAttachmentType);
        },
      },
    };
  }

  public start(core: CoreStart, plugins: CasesPluginStart): CasesUiStart {
    const config = this.initializerContext.config.get<CasesUiConfigType>();
    KibanaServices.init({ ...core, ...plugins, kibanaVersion: this.kibanaVersion, config });

    /**
     * getCasesContextLazy returns a new component each time is being called. To avoid re-renders
     * we get the component on start and provide the same component to all consumers.
     */
    const getCasesContext = getCasesContextLazy({
      externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
    });

    return {
      api: createClientAPI({ http: core.http }),
      ui: {
        getCases: (props) =>
          getCasesLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
          }),
        getCasesContext,
        getRecentCases: (props) =>
          getRecentCasesLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
          }),
        // @deprecated Please use the hook getUseCasesAddToNewCaseFlyout
        getCreateCaseFlyout: (props) =>
          getCreateCaseFlyoutLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
          }),
        // @deprecated Please use the hook getUseCasesAddToExistingCaseModal
        getAllCasesSelectorModal: (props) =>
          getAllCasesSelectorModalLazy({
            ...props,
            externalReferenceAttachmentTypeRegistry: this.externalReferenceAttachmentTypeRegistry,
            persistableStateAttachmentTypeRegistry: this.persistableStateAttachmentTypeRegistry,
          }),
      },
      hooks: {
        getUseCasesAddToNewCaseFlyout: useCasesAddToNewCaseFlyout,
        getUseCasesAddToExistingCaseModal: useCasesAddToExistingCaseModal,
      },
      helpers: {
        canUseCases: canUseCases(core.application.capabilities),
        getUICapabilities,
        getRuleIdFromEvent,
        groupAlertsByRule,
      },
    };
  }

  public stop() {}
}
