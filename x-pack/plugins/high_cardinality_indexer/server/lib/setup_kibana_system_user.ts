import { elasticsearchErrorHandler } from './elasticsearch_error_handler';
import { logger } from './logger';
import { getEsClient } from './get_es_client';
import { Config } from '../types';

export async function setupKibanaSystemUser(config: Config) {
  const client = getEsClient(config);
  await client.security.changePassword({ username: 'kibana_system', body: { password: 'changeme' } })
    .then(() => {
      logger.info('Password changed to "changeme" for "kibana_system" user');
    })
    .catch(elasticsearchErrorHandler(() => setupKibanaSystemUser(config), client, true));
  return;
}
