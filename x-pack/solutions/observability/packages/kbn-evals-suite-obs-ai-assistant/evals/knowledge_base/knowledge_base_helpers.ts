import { EsClient } from '@kbn/scout';
import pRetry from 'p-retry';

export async function clearKnowledgeBase(esClient: EsClient) {
  const KB_INDEX = '.kibana-observability-ai-assistant-kb-*';
  return pRetry(
    () => {
      return esClient.deleteByQuery({
        index: KB_INDEX,
        conflicts: 'proceed',
        query: { match_all: {} },
        refresh: true,
      });
    },
    { retries: 5 }
  );
}

export async function clearConversations(esClient: EsClient) {
  const CONV_INDEX = '.kibana-observability-ai-assistant-conversations-*';
  return pRetry(
    () => {
      return esClient.deleteByQuery({
        index: CONV_INDEX,
        conflicts: 'proceed',
        query: { match_all: {} },
        refresh: true,
      });
    },
    { retries: 5 }
  );
}
