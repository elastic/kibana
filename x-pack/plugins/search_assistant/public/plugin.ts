import { i18n } from '@kbn/i18n';
import type { AppMountParameters, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type {
  SearchAssistantPluginSetup,
  SearchAssistantPluginStart,
  SearchAssistantPluginStartDependencies,
} from './types';
import { PLUGIN_ID } from '../common';
import { SearchAssistant } from './embeddable';

export class SearchAssistantPlugin
  implements Plugin<SearchAssistantPluginSetup, SearchAssistantPluginStart>
{
  public setup(
    core: CoreSetup<SearchAssistantPluginStartDependencies, SearchAssistantPluginStart>
  ): SearchAssistantPluginSetup {
    core.application.register({
      id: PLUGIN_ID,
      appRoute: '/app/search_assistant',
      title: i18n.translate('xpack.searchAssistant.applicationTitle', {
        defaultMessage: 'Search Assistant',
      }),
      async mount({ element, history }: AppMountParameters) {
        const { renderApp } = await import('./application');
        const [coreStart, depsStart] = await core.getStartServices();
        const startDeps: SearchAssistantPluginStartDependencies = {
          ...depsStart,
          history,
        };
        return renderApp(coreStart, startDeps, element);
      },
    });
    return {};
  }

  public start(
    core: CoreStart,
    services: SearchAssistantPluginStartDependencies
  ): SearchAssistantPluginStart {
    return {
      SearchAssistant,
    };
  }

  public stop() {}
}
