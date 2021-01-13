import { CoreSetup, CoreStart, Plugin } from '../../../../src/core/public';
import { BarPluginSetup, BarPluginStart } from './types';
import { SpacesPluginStart } from '../../spaces/public';

interface PluginStartDependencies {
  spaces?: SpacesPluginStart;
}

export class BarPlugin implements Plugin<BarPluginSetup, BarPluginStart> {
  public setup(core: CoreSetup): BarPluginSetup {
    // Return methods that should be available to other plugins
    return {};
  }

  public start(core: CoreStart, deps: PluginStartDependencies): BarPluginStart {
    if (deps.spaces != null) {
      (async function () {
        const space = await deps.spaces!.getActiveSpace();
        // eslint-disable-next-line no-console
        console.log({ space });
      })();
    } else {
      // eslint-disable-next-line no-console
      console.log('spaces plugin is disabled');
    }

    return {};
  }

  public stop() {}
}
