/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup as InspectorSetupContract } from 'src/plugins/inspector/public';
import { UiActionsStart } from 'src/plugins/ui_actions/public';
import { NavigationPublicPluginStart } from 'src/plugins/navigation/public';
import { Start as InspectorStartContract } from 'src/plugins/inspector/public';
import {
  CoreSetup,
  CoreStart,
  Plugin,
  PluginInitializerContext,
  DEFAULT_APP_CATEGORIES,
} from '../../../../src/core/public';
// @ts-ignore
import { MapView } from './inspector/views/map_view';
import {
  setIsGoldPlus,
  setKibanaCommonConfig,
  setKibanaVersion,
  setLicenseId,
  setMapAppConfig,
  setStartServices,
} from './kibana_services';
import { featureCatalogueEntry } from './feature_catalogue_entry';
// @ts-ignore
import { getMapsVisTypeAlias } from './maps_vis_type_alias';
import { HomePublicPluginSetup } from '../../../../src/plugins/home/public';
import { VisualizationsSetup } from '../../../../src/plugins/visualizations/public';
import { APP_ICON, APP_ID, MAP_SAVED_OBJECT_TYPE } from '../common/constants';
import { VISUALIZE_GEO_FIELD_TRIGGER } from '../../../../src/plugins/ui_actions/public';
import { createMapsUrlGenerator } from './url_generator';
import { visualizeGeoFieldAction } from './trigger_actions/visualize_geo_field_action';
import { MapEmbeddableFactory } from './embeddable/map_embeddable_factory';
import { EmbeddableSetup } from '../../../../src/plugins/embeddable/public';
import { MapsXPackConfig, MapsConfigType } from '../config';
import { getAppTitle } from '../common/i18n_getters';
import { ILicense } from '../../licensing/common/types';
import { lazyLoadMapModules } from './lazy_load_bundle';
import { MapsStartApi } from './api';
import { createSecurityLayerDescriptors, registerLayerWizard, registerSource } from './api';
import { SharePluginSetup, SharePluginStart } from '../../../../src/plugins/share/public';
import { EmbeddableStart } from '../../../../src/plugins/embeddable/public';
import { MapsLegacyConfigType } from '../../../../src/plugins/maps_legacy/public';
import { DataPublicPluginStart } from '../../../../src/plugins/data/public';
import { LicensingPluginStart } from '../../licensing/public';
import { StartContract as FileUploadStartContract } from '../../file_upload/public';

export interface MapsPluginSetupDependencies {
  inspector: InspectorSetupContract;
  home?: HomePublicPluginSetup;
  visualizations: VisualizationsSetup;
  embeddable: EmbeddableSetup;
  mapsLegacy: { config: MapsLegacyConfigType };
  share: SharePluginSetup;
}

export interface MapsPluginStartDependencies {
  data: DataPublicPluginStart;
  embeddable: EmbeddableStart;
  fileUpload: FileUploadStartContract;
  inspector: InspectorStartContract;
  licensing: LicensingPluginStart;
  navigation: NavigationPublicPluginStart;
  uiActions: UiActionsStart;
  share: SharePluginStart;
}

/**
 * These are the interfaces with your public contracts. You should export these
 * for other plugins to use in _their_ `SetupDeps`/`StartDeps` interfaces.
 * @public
 */
export type MapsPluginSetup = ReturnType<MapsPlugin['setup']>;
export type MapsPluginStart = ReturnType<MapsPlugin['start']>;

/** @internal */
export class MapsPlugin
  implements
    Plugin<
      MapsPluginSetup,
      MapsPluginStart,
      MapsPluginSetupDependencies,
      MapsPluginStartDependencies
    > {
  readonly _initializerContext: PluginInitializerContext<MapsXPackConfig>;

  constructor(initializerContext: PluginInitializerContext<MapsXPackConfig>) {
    this._initializerContext = initializerContext;
  }

  public setup(core: CoreSetup, plugins: MapsPluginSetupDependencies) {
    const config = this._initializerContext.config.get<MapsConfigType>();
    setKibanaCommonConfig(plugins.mapsLegacy.config);
    setMapAppConfig(config);
    setKibanaVersion(this._initializerContext.env.packageInfo.version);
    plugins.share.urlGenerators.registerUrlGenerator(
      createMapsUrlGenerator(async () => {
        const [coreStart] = await core.getStartServices();
        return {
          appBasePath: coreStart.application.getUrlForApp('maps'),
          useHashedUrl: coreStart.uiSettings.get('state:storeInSessionStorage'),
        };
      })
    );

    plugins.inspector.registerView(MapView);
    if (plugins.home) {
      plugins.home.featureCatalogue.register(featureCatalogueEntry);
    }
    plugins.visualizations.registerAlias(
      getMapsVisTypeAlias(plugins.visualizations, config.showMapVisualizationTypes)
    );
    plugins.embeddable.registerEmbeddableFactory(MAP_SAVED_OBJECT_TYPE, new MapEmbeddableFactory());

    core.application.register({
      id: APP_ID,
      title: getAppTitle(),
      order: 4000,
      icon: `plugins/${APP_ID}/icon.svg`,
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.kibana,
      // @ts-expect-error
      async mount(context, params) {
        const { renderApp } = await lazyLoadMapModules();
        return renderApp(context, params);
      },
    });
  }

  public start(core: CoreStart, plugins: MapsPluginStartDependencies): MapsStartApi {
    if (plugins.licensing) {
      plugins.licensing.license$.subscribe((license: ILicense) => {
        const gold = license.check(APP_ID, 'gold');
        setIsGoldPlus(gold.state === 'valid');
        setLicenseId(license.uid);
      });
    }
    plugins.uiActions.addTriggerAction(VISUALIZE_GEO_FIELD_TRIGGER, visualizeGeoFieldAction);
    setStartServices(core, plugins);

    return {
      createSecurityLayerDescriptors,
      registerLayerWizard,
      registerSource,
    };
  }
}
