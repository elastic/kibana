import { CoreSetup, Plugin, PluginInitializerContext } from '../../../../src/core/public';
import { TimelinePluginSetup, TimelineProps } from './types';
import { getTimelineLazy } from './methods';

export class TimelinePlugin implements Plugin<TimelinePluginSetup> {
  constructor(private readonly initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup): TimelinePluginSetup {
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
