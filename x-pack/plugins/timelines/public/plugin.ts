import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/public';
import { TimelinesPluginSetup, TimelineProps } from './types';
import { getTimelineLazy } from './methods';

export class TimelinesPlugin implements Plugin<TimelinesPluginSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): TimelinesPluginSetup {
    const config = this.initializerContext.config.get<{ enabled: boolean }>();
    if (!config.enabled) {
      return {};
    }

    return {
      getTimeline: (props: TimelineProps) => {
        return getTimelineLazy(props);
      },
    };
  }

  public start() {}

  public stop() {}
}
