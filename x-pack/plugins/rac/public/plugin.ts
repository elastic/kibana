import { i18n } from '@kbn/i18n';
import {
  AppMountParameters,
  CoreSetup,
  CoreStart,
  DEFAULT_APP_CATEGORIES,
  Plugin,
} from '../../../../src/core/public';
import { RacPluginSetup, RacPluginStart, AppPluginStartDependencies } from './types';
import { APP_ICON, PLUGIN_NAME } from '../common';

export class RacPlugin implements Plugin<RacPluginSetup, RacPluginStart> {
  public setup(core: CoreSetup): RacPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'rules',
      title: 'Rules',
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.rac,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    core.application.register({
      id: 'alerts',
      title: 'Alerts',
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.rac,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    core.application.register({
      id: 'cases',
      title: 'Cases',
      euiIconType: APP_ICON,
      category: DEFAULT_APP_CATEGORIES.rac,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    // core.application.register({
    //   id: `${PLUGIN_ID}:${RacPageName.rules}`,
    //   title: RULES,
    //   order: 9000,
    //   euiIconType: APP_ICON_SOLUTION,
    //   category: DEFAULT_APP_CATEGORIES.rac,
    //   appRoute: APP_RULES_PATH,
    //   mount: async (params: AppMountParameters) => {
    //     const [coreStart, startPlugins] = await core.getStartServices();
    //     const { overview: subPlugin } = await this.subPlugins();
    //     const { renderApp, composeLibs } = await this.lazyApplicationDependencies();
    //
    //     return renderApp({
    //       ...composeLibs(coreStart),
    //       ...params,
    //       services: await startServices,
    //       store: await this.store(coreStart, startPlugins),
    //       SubPluginRoutes: subPlugin.start().SubPluginRoutes,
    //     });
    //   },
    // });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('rac.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): RacPluginStart {
    return {};
  }

  public stop() {}
}
