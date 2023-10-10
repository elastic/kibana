import { isArray } from 'lodash';
import { elasticsearchErrorHandler } from './elasticsearch_error_handler';
import { logger } from './logger';
import { Config } from '../types';
import { templates } from '../data_sources';
import { getEsClient } from './get_es_client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function installTemplate(config: Config): Promise<any> {
  const namespace = config.indexing.dataset;
  const client = getEsClient(config);
  const template = templates[config.indexing.dataset] || templates.fake_logs;
  if (isArray(template) && template.length !== 0) {
    const templateNames = template.map(templateDef => templateDef.namespace).join(',');
    logger.info(`Installing templates (${templateNames})`);
    return Promise.all(template.map(templateDef => {
      const templateNamespace = `${namespace}.${templateDef.namespace}`;
      return client.indices
        .putTemplate({ name: `high-cardinality-data-${templateNamespace}`, body: templateDef.template })
        .catch(elasticsearchErrorHandler(() => installTemplate(config), client));
    }));
  }

  if (template && !isArray(template)) {
    logger.info('Installing template');
    return client.indices
      .putTemplate({ name: `high-cardinality-data-${namespace}`, body: template })
      .catch(elasticsearchErrorHandler(() => installTemplate(config), client));
  }

}
