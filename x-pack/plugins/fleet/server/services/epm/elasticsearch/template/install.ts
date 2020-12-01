/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { SavedObjectsClientContract } from 'src/core/server';
import {
  RegistryDataStream,
  ElasticsearchAssetType,
  TemplateRef,
  RegistryElasticsearch,
  InstallablePackage,
} from '../../../../types';
import { CallESAsCurrentUser } from '../../../../types';
import { Field, loadFieldsFromYaml, processFields } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { generateMappings, generateTemplateName, getTemplate } from './template';
import { getAsset, getPathParts } from '../../archive';
import { removeAssetsFromInstalledEsByType, saveInstalledEsRefs } from '../../packages/install';

export const installTemplates = async (
  installablePackage: InstallablePackage,
  callCluster: CallESAsCurrentUser,
  paths: string[],
  savedObjectsClient: SavedObjectsClientContract
): Promise<TemplateRef[]> => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global index templates
  // Install component templates first, as they are used by the index templates
  await installPreBuiltComponentTemplates(paths, callCluster);
  await installPreBuiltTemplates(paths, callCluster);

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
            callCluster,
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

const installPreBuiltTemplates = async (paths: string[], callCluster: CallESAsCurrentUser) => {
  const templatePaths = paths.filter((path) => isTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));
    let templateAPIPath = '_template';

    // v2 index templates need to be installed through the new API endpoint.
    // Checking for 'template' and 'composed_of' should catch them all.
    // For the new v2 format, see https://github.com/elastic/elasticsearch/issues/53101
    if (content.hasOwnProperty('template') || content.hasOwnProperty('composed_of')) {
      templateAPIPath = '_index_template';
    }

    const callClusterParams: {
      method: string;
      path: string;
      ignore: number[];
      body: any;
    } = {
      method: 'PUT',
      path: `/${templateAPIPath}/${templateName}`,
      ignore: [404],
      body: content,
    };
    // This uses the catch-all endpoint 'transport.request' because there is no
    // convenience endpoint using the new _index_template API yet.
    // The existing convenience endpoint `indices.putTemplate` only sends to _template,
    // which does not support v2 templates.
    // See src/core/server/elasticsearch/api_types.ts for available endpoints.
    return callCluster('transport.request', callClusterParams);
  });
  try {
    return await Promise.all(templateInstallPromises);
  } catch (e) {
    throw new Boom(`Error installing prebuilt index templates ${e.message}`, {
      statusCode: 400,
    });
  }
};

const installPreBuiltComponentTemplates = async (
  paths: string[],
  callCluster: CallESAsCurrentUser
) => {
  const templatePaths = paths.filter((path) => isComponentTemplate(path));
  const templateInstallPromises = templatePaths.map(async (path) => {
    const { file } = getPathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(getAsset(path).toString('utf8'));

    const callClusterParams: {
      method: string;
      path: string;
      ignore: number[];
      body: any;
    } = {
      method: 'PUT',
      path: `/_component_template/${templateName}`,
      ignore: [404],
      body: content,
    };
    // This uses the catch-all endpoint 'transport.request' because there is no
    // convenience endpoint for component templates yet.
    // See src/core/server/elasticsearch/api_types.ts for available endpoints.
    return callCluster('transport.request', callClusterParams);
  });
  try {
    return await Promise.all(templateInstallPromises);
  } catch (e) {
    throw new Boom(`Error installing prebuilt component templates ${e.message}`, {
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
  callCluster,
  dataStream,
}: {
  pkg: InstallablePackage;
  callCluster: CallESAsCurrentUser;
  dataStream: RegistryDataStream;
}): Promise<TemplateRef> {
  const fields = await loadFieldsFromYaml(pkg, dataStream.path);
  return installTemplate({
    callCluster,
    fields,
    dataStream,
    packageVersion: pkg.version,
    packageName: pkg.name,
  });
}

function putComponentTemplate(
  body: object | undefined,
  name: string,
  callCluster: CallESAsCurrentUser
): { clusterPromise: Promise<any>; name: string } | undefined {
  if (body) {
    const callClusterParams: {
      method: string;
      path: string;
      ignore: number[];
      body: any;
    } = {
      method: 'PUT',
      path: `/_component_template/${name}`,
      ignore: [404],
      body,
    };

    return { clusterPromise: callCluster('transport.request', callClusterParams), name };
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
          // temporary change until https://github.com/elastic/elasticsearch/issues/58956 is resolved
          // hopefully we'll be able to remove the entire properties section once that issue is resolved
          properties: {
            // if the timestamp_field changes here: https://github.com/elastic/kibana/blob/master/x-pack/plugins/fleet/server/services/epm/elasticsearch/template/template.ts#L309
            // we'll need to update this as well
            '@timestamp': {
              type: 'date',
            },
          },
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
  callCluster: CallESAsCurrentUser
) {
  const templates: string[] = [];
  const componentPromises: Array<Promise<any>> = [];

  const compTemplates = buildComponentTemplates(registryElasticsearch);

  const mappings = putComponentTemplate(
    compTemplates.mappingsTemplate,
    `${templateName}-mappings`,
    callCluster
  );

  const settings = putComponentTemplate(
    compTemplates.settingsTemplate,
    `${templateName}-settings`,
    callCluster
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

export async function installTemplate({
  callCluster,
  fields,
  dataStream,
  packageVersion,
  packageName,
}: {
  callCluster: CallESAsCurrentUser;
  fields: Field[];
  dataStream: RegistryDataStream;
  packageVersion: string;
  packageName: string;
}): Promise<TemplateRef> {
  const mappings = generateMappings(processFields(fields));
  const templateName = generateTemplateName(dataStream);
  let pipelineName;
  if (dataStream.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation({
      pipelineName: dataStream.ingest_pipeline,
      dataStream,
      packageVersion,
    });
  }

  const composedOfTemplates = await installDataStreamComponentTemplates(
    templateName,
    dataStream.elasticsearch,
    callCluster
  );

  const template = getTemplate({
    type: dataStream.type,
    templateName,
    mappings,
    pipelineName,
    packageName,
    composedOfTemplates,
  });

  // TODO: Check return values for errors
  const callClusterParams: {
    method: string;
    path: string;
    ignore: number[];
    body: any;
  } = {
    method: 'PUT',
    path: `/_index_template/${templateName}`,
    ignore: [404],
    body: template,
  };
  // This uses the catch-all endpoint 'transport.request' because there is no
  // convenience endpoint using the new _index_template API yet.
  // The existing convenience endpoint `indices.putTemplate` only sends to _template,
  // which does not support v2 templates.
  // See src/core/server/elasticsearch/api_types.ts for available endpoints.
  await callCluster('transport.request', callClusterParams);

  return {
    templateName,
    indexTemplate: template,
  };
}
