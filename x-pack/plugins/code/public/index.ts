import { PluginInitializer } from '../../../../src/core/public';
import { CodePlugin, CodePluginSetup } from './plugin';

export const plugin: PluginInitializer<CodePluginSetup> = () => new CodePlugin();
