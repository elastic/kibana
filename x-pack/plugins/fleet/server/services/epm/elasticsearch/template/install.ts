/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { ElasticsearchClient, SavedObjectsClientContract } from 'src/core/server';

import { ElasticsearchAssetType } from '../../../../types';
import type {
  RegistryDataStream,
  TemplateRef,
  RegistryElasticsearch,
  InstallablePackage,
} from '../../../../types';
import { loadFieldsFromYaml, processFields } from '../../fields/field';
import type { Field } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { getAsset, getPathParts } from '../../archive';
import { removeAssetsFromInstalledEsByType, saveInstalledEsRefs } from '../../packages/install';
import {
  FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME,
  FLEET_GLOBAL_COMPONENT_TEMPLATE_CONTENT,
} from '../../../../constants';

import {
  generateMappings,
  generateTemplateName,
  generateTemplateIndexPattern,
  getTemplate,
  getTemplatePriority,
} from './template';

export const installTemplates = async (
  installablePackage: InstallablePackage,
  esClient: ElasticsearchClient,
  paths: string[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<TemplateRef[]> => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global index templates
  // Install component templates first, as they are used by the index templates
  await installPreBuiltComponentTemplates(paths, esClient);
  await installPreBuiltTemplates(paths, esClient);

  // remove package installation's references to index templates
  await removeAssetsFromInstalledEsByType(
    savedObjectsClient,
    installablePackage.name,
    ElasticsearchAssetType.indexTemplate
  );
  // build templates per data stream from yml files
  const dataStreams = installablePackage.data_streams;
  if (!dataStreams) return [];
  // get template refs to save
  const installedTemplateRefs = dataStreams.map((dataStream) => ({
    id: generateTemplateName(dataStream),
    type: ElasticsearchAssetType.indexTemplate,
  }));

  // add package installation's references to index templates
  await saveInstalledEsRefs(savedObjectsClient, installablePackage.name, installedTemplateRefs);

  if (dataStreams) {
    const installTemplatePromises = dataStreams.reduce<Array<Promise<TemplateRef>>>(
      (acc, dataStream) => {
        acc.push(
          installTemplateForDataStream({
            pkg: installablePackage,
            esClient,
            dataStream,
          })
        );
        return acc;
      },
      []
    );

    const res = await Promise.all(installTemplatePromises);
    const installedTemplates = res.flat();

    return installedTemplates;
  }
  return [];
};

const installPreBuiltTemplates = async (paths: string[], esClient: ElasticsearchClient) => {
  const templatePaths = paths.filter((path) => isTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));

    const esClientParams = { name: templateName, body: content };
    const esClientRequestOptions = { ignore: [404] };

    if (content.hasOwnProperty('template') || content.hasOwnProperty('composed_of')) {
      // Template is v2
      return esClient.indices.putIndexTemplate(esClientParams, esClientRequestOptions);
    } else {
      // template is V1
      return esClient.indices.putTemplate(esClientParams, esClientRequestOptions);
    }
  });
  try {
    return await Promise.all(templateInstallPromises);
  } catch (e) {
    throw new Boom.Boom(`Error installing prebuilt index templates ${e.message}`, {
      statusCode: 400,
    });
  }
};

const installPreBuiltComponentTemplates = async (
  paths: string[],
  esClient: ElasticsearchClient
) => {
  const templatePaths = paths.filter((path) => isComponentTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));

    const esClientParams = {
      name: templateName,
      body: content,
    };

    return esClient.cluster.putComponentTemplate(esClientParams, { ignore: [404] });
  });

  try {
    return await Promise.all(templateInstallPromises);
  } catch (e) {
    throw new Boom.Boom(`Error installing prebuilt component templates ${e.message}`, {
      statusCode: 400,
    });
  }
};

const isTemplate = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.indexTemplate;
};

const isComponentTemplate = (path: string) => {
  const pathParts = getPathParts(path);
  return pathParts.type === ElasticsearchAssetType.componentTemplate;
};

/**
 * installTemplateForDataStream installs one template for each data stream
 *
 * The template is currently loaded with the pkgkey-package-data_stream
 */

export async function installTemplateForDataStream({
  pkg,
  esClient,
  dataStream,
}: {
  pkg: InstallablePackage;
  esClient: ElasticsearchClient;
  dataStream: RegistryDataStream;
}): Promise<TemplateRef> {
  const fields = await loadFieldsFromYaml(pkg, dataStream.path);
  return installTemplate({
    esClient,
    fields,
    dataStream,
    packageVersion: pkg.version,
    packageName: pkg.name,
  });
}

function putComponentTemplate(
  body: object | undefined,
  name: string,
  esClient: ElasticsearchClient
): { clusterPromise: Promise<any>; name: string } | undefined {
  if (body) {
    const esClientParams = {
      name,
      body,
    };

    return {
      // @ts-expect-error body expected to be ClusterPutComponentTemplateRequest
      clusterPromise: esClient.cluster.putComponentTemplate(esClientParams, { ignore: [404] }),
      name,
    };
  }
}

function buildComponentTemplates(registryElasticsearch: RegistryElasticsearch | undefined) {
  let mappingsTemplate;
  let settingsTemplate;

  if (registryElasticsearch && registryElasticsearch['index_template.mappings']) {
    mappingsTemplate = {
      template: {
        mappings: {
          ...registryElasticsearch['index_template.mappings'],
        },
      },
    };
  }

  if (registryElasticsearch && registryElasticsearch['index_template.settings']) {
    settingsTemplate = {
      template: {
        settings: registryElasticsearch['index_template.settings'],
      },
    };
  }
  return { settingsTemplate, mappingsTemplate };
}

async function installDataStreamComponentTemplates(
  templateName: string,
  registryElasticsearch: RegistryElasticsearch | undefined,
  esClient: ElasticsearchClient
) {
  const templates: string[] = [];
  const componentPromises: Array<Promise<any>> = [];

  const compTemplates = buildComponentTemplates(registryElasticsearch);

  const mappings = putComponentTemplate(
    compTemplates.mappingsTemplate,
    `${templateName}-mappings`,
    esClient
  );

  const settings = putComponentTemplate(
    compTemplates.settingsTemplate,
    `${templateName}-settings`,
    esClient
  );

  if (mappings) {
    templates.push(mappings.name);
    componentPromises.push(mappings.clusterPromise);
  }

  if (settings) {
    templates.push(settings.name);
    componentPromises.push(settings.clusterPromise);
  }

  // TODO: Check return values for errors
  await Promise.all(componentPromises);
  return templates;
}

export async function ensureDefaultComponentTemplate(esClient: ElasticsearchClient) {
  const { body: getTemplateRes } = await esClient.cluster.getComponentTemplate(
    {
      name: FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME,
    },
    {
      ignore: [404],
    }
  );

  const existingTemplate = getTemplateRes?.component_templates?.[0];
  if (!existingTemplate) {
    await putComponentTemplate(
      FLEET_GLOBAL_COMPONENT_TEMPLATE_CONTENT,
      FLEET_GLOBAL_COMPONENT_TEMPLATE_NAME,
      esClient
    );
  }

  return { isCreated: !existingTemplate };
}

export async function installTemplate({
  esClient,
  fields,
  dataStream,
  packageVersion,
  packageName,
}: {
  esClient: ElasticsearchClient;
  fields: Field[];
  dataStream: RegistryDataStream;
  packageVersion: string;
  packageName: string;
}): Promise<TemplateRef> {
  const validFields = processFields(fields);
  const mappings = generateMappings(validFields);
  const templateName = generateTemplateName(dataStream);
  const templateIndexPattern = generateTemplateIndexPattern(dataStream);
  const templatePriority = getTemplatePriority(dataStream);

  let pipelineName;
  if (dataStream.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation({
      pipelineName: dataStream.ingest_pipeline,
      dataStream,
      packageVersion,
    });
  }

  // Datastream now throw an error if the aliases field is present so ensure that we remove that field.
  const { body: getTemplateRes } = await esClient.indices.getIndexTemplate(
    {
      name: templateName,
    },
    {
      ignore: [404],
    }
  );

  const existingIndexTemplate = getTemplateRes?.index_templates?.[0];
  if (
    existingIndexTemplate &&
    existingIndexTemplate.name === templateName &&
    existingIndexTemplate?.index_template?.template?.aliases
  ) {
    const updateIndexTemplateParams = {
      name: templateName,
      body: {
        ...existingIndexTemplate.index_template,
        template: {
          ...existingIndexTemplate.index_template.template,
          // Remove the aliases field
          aliases: undefined,
        },
      },
    };

    await esClient.indices.putIndexTemplate(updateIndexTemplateParams, { ignore: [404] });
  }

  const composedOfTemplates = await installDataStreamComponentTemplates(
    templateName,
    dataStream.elasticsearch,
    esClient
  );

  const template = getTemplate({
    type: dataStream.type,
    templateIndexPattern,
    fields: validFields,
    mappings,
    pipelineName,
    packageName,
    composedOfTemplates,
    templatePriority,
    ilmPolicy: dataStream.ilm_policy,
    hidden: dataStream.hidden,
  });

  // TODO: Check return values for errors
  const esClientParams = {
    name: templateName,
    body: template,
  };

  await esClient.indices.putIndexTemplate(esClientParams, { ignore: [404] });

  return {
    templateName,
    indexTemplate: template,
  };
}
