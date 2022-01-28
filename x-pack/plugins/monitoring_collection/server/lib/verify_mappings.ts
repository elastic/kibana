/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import { ElasticsearchClient, Logger } from 'kibana/server';
import { MakeSchemaFrom } from '../../../../../src/plugins/usage_collection/server';
import { Metric } from '../plugin';

interface Params {
  client: ElasticsearchClient;
  name: string;
  metrics: Array<Metric<any>>;
  logger: Logger;
}

function buildSchemaFields(schema: MakeSchemaFrom<any>, paths: string[] = []) {
  return Object.entries(schema).reduce((accum: string[], [key, value]) => {
    if (typeof value.type === 'string') {
      accum.push([...paths, key].join('.properties.'));
    } else {
      accum.push(...buildSchemaFields(value as MakeSchemaFrom<any>, [...paths, key]));
    }
    return accum;
  }, []);
}

export async function verifyMappings({ client, name, metrics, logger }: Params) {
  const typesToDisable = new Set<string>();
  try {
    const [{ body: templates }, { body: template }] = await Promise.all([
      client.indices.getIndexTemplate({ name: `${name}*` }),
      client.indices.getTemplate({ name: `${name}*` }),
    ]);

    if (templates.index_templates.length !== 1) {
      logger.warn(
        `Found more than one matching index template for mappings which is unexpected. Skipping mapping verification`
      );
      return;
    }

    const templateValues = Object.values(template);
    if (templateValues.length !== 1) {
      logger.warn(
        `Found more than one matching template for mappings which is unexpected. Skipping mapping verification`
      );
      return;
    }

    const internalMappings = templateValues[0].mappings.properties;
    const mbMappings = templates.index_templates[0].index_template.template?.mappings?.properties;
    metrics.forEach(({ type, schema }) => {
      if (!internalMappings?.hasOwnProperty(`kibana_${type}`)) {
        logger.warn(
          `Disabling type '${type}' because is not available in the internal mappings. To fix these, please update the mappings in Elasticsearch`
        );
        typesToDisable.add(type);
        return;
      }

      if (!mbMappings?.kibana?.properties?.hasOwnProperty(type)) {
        logger.warn(
          `Disabling type '${type}' because is not available in the Metricbeat mappings. To fix these, please update the mappings in Elasticsearch`
        );
        typesToDisable.add(type);
        return;
      }

      const fields = buildSchemaFields(schema);
      fields.forEach((field) => {
        if (get(internalMappings, `kibana_${type}.properties.${field}`) === undefined) {
          logger.warn(
            `Disabling type '${type}' because field: 'kibana_${type}.properties.${field}' is not present in the internal mappings. To fix these, please update the mappings in Elasticsearch`
          );
          typesToDisable.add(type);
        }
        if (get(mbMappings, `kibana.properties.${type}.properties.${field}`) === undefined) {
          logger.warn(
            `Disabling type '${type}' because field: 'kibana.properties.${type}.properties.${field}' is not present in the Metricbeat mappings. To fix these, please update the mappings in Elasticsearch`
          );
          typesToDisable.add(type);
        }
      });
    });
  } catch (err) {
    logger.warn(
      `Unable to verify mappings due to '${err.message}'. This will not prevent any functionality but some collectors might be storing data that is not supported in the mappings.`
    );
  }

  return Array.from(typesToDisable);
}
