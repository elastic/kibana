import { AppMountParameters } from '@kbn/core/public';
import { UsageCollectionStart } from '@kbn/usage-collection-plugin/public';
import { ObservabilityAIAssistantPublicStart } from '@kbn/observability-ai-assistant-plugin/public';
import { ComponentProps, FC } from 'react';
import type { SearchAssistantPage } from './components/search_assistant';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SearchAssistantPluginSetup {}

export interface SearchAssistantPluginStart {
  SearchAssistant: FC<ComponentProps<typeof SearchAssistantPage>>;
}

export interface SearchAssistantPluginStartDependencies {
  history: AppMountParameters['history'];
  observailbilityAssistant: ObservabilityAIAssistantPublicStart;
  usageCollection?: UsageCollectionStart;
}
