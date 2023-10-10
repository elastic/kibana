import { indexTemplates } from "../data_sources";
import { Config } from "../types";
import { getEsClient } from "./get_es_client";
import { logger } from "./logger";

export async function installIndexTemplate(config: Config): Promise<void> {
  const namespace = config.indexing.dataset;
  const client = getEsClient(config);
  const templates = indexTemplates[namespace];
  const templateNames = templates.map(templateDef => templateDef.namespace).join(',');
  logger.info(`Installing index templates (${templateNames})`);
  for(const indexTemplateDef of templates) {
    const componentNames = indexTemplateDef.components.map(({ name }) => name);
    logger.info(`Installing components for ${indexTemplateDef.namespace} (${componentNames})`);
    for(const component of indexTemplateDef.components) {
      await client.cluster.putComponentTemplate({ name: component.name, body: component.template });
    }
    logger.info(`Installing index template (${indexTemplateDef.namespace})`);
    await client.indices.putIndexTemplate({ name: indexTemplateDef.namespace, body: indexTemplateDef.template });
  }
}
