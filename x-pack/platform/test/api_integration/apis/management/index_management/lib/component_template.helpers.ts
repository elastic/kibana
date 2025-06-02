/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../../../ftr_provider_context';

export function componentTemplateHelpers(getService: FtrProviderContext['getService']) {
  const log = getService('log');
  const es = getService('es');

  let componentTemplatesCreated: string[] = [];
  let indexTemplatesCreated: string[] = [];
  let datastreamCreated: string[] = [];

  const removeComponentTemplate = (name: string) => es.cluster.deleteComponentTemplate({ name });

  const removeDatastream = (datastream: string) =>
    es.indices.deleteDataStream({ name: datastream });

  const removeIndexTemplate = (name: string) =>
    es.indices.deleteIndexTemplate({ name }, { meta: true });

  const addComponentTemplate = (componentTemplate: any, shouldCacheTemplate: boolean) => {
    if (shouldCacheTemplate) {
      componentTemplatesCreated.push(componentTemplate.name);
    }

    return es.cluster.putComponentTemplate(componentTemplate, { meta: true });
  };

  const addIndexTemplate = (indexTemplate: any, shouldCacheTemplate: boolean) => {
    if (shouldCacheTemplate) {
      indexTemplatesCreated.push(indexTemplate.name);
    }

    return es.indices.putIndexTemplate(indexTemplate, { meta: true });
  };

  const addDatastream = (datastream: string, shouldCacheTemplate: boolean) => {
    if (shouldCacheTemplate) {
      datastreamCreated.push(datastream);
    }

    return es.indices.createDataStream({ name: datastream });
  };

  const cleanUpComponentTemplates = () =>
    Promise.all(componentTemplatesCreated.map(removeComponentTemplate))
      .then(() => {
        componentTemplatesCreated = [];
      })
      .catch((err) => {
        log.debug(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  const cleanUpIndexTemplates = () =>
    Promise.all(indexTemplatesCreated.map(removeIndexTemplate))
      .then(() => {
        indexTemplatesCreated = [];
      })
      .catch((err) => {
        log.debug(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  const cleanupDatastreams = () =>
    Promise.all(datastreamCreated.map(removeDatastream))
      .then(() => {
        datastreamCreated = [];
      })
      .catch((err) => {
        log.debug(`[Cleanup error] Error deleting ES resources: ${err.message}`);
      });

  return {
    addDatastream,
    addIndexTemplate,
    addComponentTemplate,

    removeDatastream,
    removeIndexTemplate,
    removeComponentTemplate,

    cleanupDatastreams,
    cleanUpIndexTemplates,
    cleanUpComponentTemplates,
  };
}
