import { EsClient } from '@kbn/scout-oblt';
import pRetry from 'p-retry';

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
