/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  IndicesPutIndexTemplateRequest,
  IndicesPutTemplateRequest,
} from '@elastic/elasticsearch/lib/api/types';
import type { JsonObject } from '@kbn/utility-types';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { getRandomString } from './random';

/**
 * Helpers to create and delete indices on the Elasticsearch instance
 * during our tests.
 * @param {ElasticsearchClient} es The Elasticsearch client instance
 */
export const initElasticsearchHelpers = (getService: FtrProviderContext['getService']) => {
  const es = getService('es');
  const esDeleteAllIndices = getService('esDeleteAllIndices');

  let indicesCreated: string[] = [];
  let templatesCreated: string[] = [];
  let composableTemplatesCreated: string[] = [];
  let dataStreamsCreated: string[] = [];

  // Indices
  const getIndex = (index: string) => es.indices.get({ index });

  const createIndex = (index = getRandomString()) => {
    indicesCreated.push(index);
    return es.indices.create({ index }).then(() => index);
  };

  const deleteAllIndices = async () => {
    await esDeleteAllIndices(indicesCreated);
    indicesCreated = [];
  };

  // Data streams
  const createDataStream = <TDocument extends JsonObject>(
    dataStream = getRandomString(),
    document: TDocument
  ) => {
    dataStreamsCreated.push(dataStream);
    return es.index({ index: dataStream, document }, { meta: true });
  };

  const deleteDataStream = (dataStream: string) => {
    dataStreamsCreated = dataStreamsCreated.filter((i) => i !== dataStream);
    return es.indices.deleteDataStream({ name: dataStream }, { meta: true });
  };

  const deleteAllDataStreams = () =>
    Promise.all(dataStreamsCreated.map(deleteDataStream)).then(() => (dataStreamsCreated = []));

  // Index templates
  const getIndexTemplates = () => es.indices.getTemplate(undefined, { meta: true });

  // Create index template if it does not already exist
  const createIndexTemplate = (
    name: string,
    template: Omit<IndicesPutTemplateRequest, 'name' | 'create' | 'master_timeout' | 'cause'>
  ) => {
    templatesCreated.push(name);
    return es.indices.putTemplate({ name, create: true, ...template }, { meta: true });
  };

  const createComposableIndexTemplate = (
    name: string,
    template: Omit<IndicesPutIndexTemplateRequest, 'name' | 'create' | 'master_timeout' | 'cause'>
  ) => {
    composableTemplatesCreated.push(name);
    return es.indices.putIndexTemplate({ name, create: true, ...template }, { meta: true });
  };

  const deleteIndexTemplate = (name: string) => {
    templatesCreated = templatesCreated.filter((i) => i !== name);
    return es.indices.deleteTemplate({ name }, { meta: true }).catch((err) => {
      // Silently fail templates not found
      if (err.statusCode !== 404) {
        throw err;
      }
    });
  };

  const deleteComposableIndexTemplate = (name: string) => {
    composableTemplatesCreated = composableTemplatesCreated.filter((i) => i !== name);
    return es.indices.deleteIndexTemplate({ name }, { meta: true }).catch((err) => {
      // Silently fail if templates not found
      if (err.statusCode !== 404) {
        throw err;
      }
    });
  };

  const deleteAllTemplates = () =>
    Promise.all(templatesCreated.map(deleteIndexTemplate)).then(() => (templatesCreated = []));

  const deleteAllComposableTemplates = () =>
    Promise.all(composableTemplatesCreated.map(deleteComposableIndexTemplate)).then(
      () => (composableTemplatesCreated = [])
    );

  const cleanUp = async () => {
    await deleteAllDataStreams();
    await deleteAllComposableTemplates();
    await deleteAllTemplates();
    await deleteAllIndices();
  };

  const getNodesStats = () => es.nodes.stats();

  return {
    getIndex,
    createIndex,
    createDataStream,
    deleteAllIndices,
    deleteAllTemplates,
    getIndexTemplates,
    createIndexTemplate,
    deleteIndexTemplate,
    createComposableIndexTemplate,
    getNodesStats,
    cleanUp,
  };
};
