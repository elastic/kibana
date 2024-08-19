import { AppMountParameters } from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchAssistantPluginSetup {}

export interface SearchAssistantPluginStart {}

export interface SearchAssistantPluginStartDependencies {
  history: AppMountParameters['history'];
  observabilityAIAssistant: ObservabilityAIAssistantPublicStart;
  usageCollection?: UsageCollectionStart;
}
