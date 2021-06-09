import { i18n } from '@kbn/i18n';
import { AppMountParameters, CoreSetup, CoreStart, Plugin } from '../../../../src/core/public';
import { EcsMapperPluginSetup, EcsMapperPluginStart, AppPluginStartDependencies } from './types';
import { PLUGIN_NAME } from '../common';

export class EcsMapperPlugin implements Plugin<EcsMapperPluginSetup, EcsMapperPluginStart> {
  public setup(core: CoreSetup): EcsMapperPluginSetup {
    // Register an application into the side navigation menu
    core.application.register({
      id: 'ecsMapper',
      title: PLUGIN_NAME,
      async mount(params: AppMountParameters) {
        // Load application bundle
        const { renderApp } = await import('./application');
        // Get start services as specified in kibana.json
        const [coreStart, depsStart] = await core.getStartServices();
        // Render the application
        return renderApp(coreStart, depsStart as AppPluginStartDependencies, params);
      },
    });

    // Return methods that should be available to other plugins
    return {
      getGreeting() {
        return i18n.translate('ecsMapper.greetingText', {
          defaultMessage: 'Hello from {name}!',
          values: {
            name: PLUGIN_NAME,
          },
        });
      },
    };
  }

  public start(core: CoreStart): EcsMapperPluginStart {
    return {};
  }

  public stop() {}
}
