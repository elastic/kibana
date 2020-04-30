/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Dataset, RegistryPackage, ElasticsearchAssetType, TemplateRef } from '../../../../types';
import { CallESAsCurrentUser } from '../../../../types';
import { Field, loadFieldsFromYaml, processFields } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { generateMappings, generateTemplateName, getTemplate } from './template';
import * as Registry from '../../registry';

export const installTemplates = async (
  registryPackage: RegistryPackage,
  callCluster: CallESAsCurrentUser,
  pkgName: string,
  pkgVersion: string
): Promise<TemplateRef[]> => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global index templates
  // Install component templates first, as they are used by the index templates
  installPreBuiltComponentTemplates(pkgName, pkgVersion, callCluster);
  installPreBuiltTemplates(pkgName, pkgVersion, callCluster);

  // build templates per dataset from yml files
  const datasets = registryPackage.datasets;
  if (datasets) {
    const installTemplatePromises = datasets.reduce<Array<Promise<TemplateRef>>>((acc, dataset) => {
      acc.push(
        installTemplateForDataset({
          pkg: registryPackage,
          callCluster,
          dataset,
        })
      );
      return acc;
    }, []);

    const res = await Promise.all(installTemplatePromises);
    return res.flat();
  }
  return [];
};

const installPreBuiltTemplates = async (
  pkgName: string,
  pkgVersion: string,
  callCluster: CallESAsCurrentUser
) => {
  const templatePaths = await Registry.getArchiveInfo(
    pkgName,
    pkgVersion,
    (entry: Registry.ArchiveEntry) => isTemplate(entry)
  );
  // templatePaths.forEach(async path => {
  //   const { file } = Registry.pathParts(path);
  //   const templateName = file.substr(0, file.lastIndexOf('.'));
  //   const content = JSON.parse(Registry.getAsset(path).toString('utf8'));
  //   await callCluster('indices.putTemplate', {
  //     name: templateName,
  //     body: content,
  //   });
  // });
  templatePaths.forEach(async path => {
    const { file } = Registry.pathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(Registry.getAsset(path).toString('utf8'));
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
    await callCluster('transport.request', callClusterParams);
  });
};

const installPreBuiltComponentTemplates = async (
  pkgName: string,
  pkgVersion: string,
  callCluster: CallESAsCurrentUser
) => {
  const templatePaths = await Registry.getArchiveInfo(
    pkgName,
    pkgVersion,
    (entry: Registry.ArchiveEntry) => isComponentTemplate(entry)
  );
  templatePaths.forEach(async path => {
    const { file } = Registry.pathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(Registry.getAsset(path).toString('utf8'));

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
    await callCluster('transport.request', callClusterParams);
  });
};

const isTemplate = ({ path }: Registry.ArchiveEntry) => {
  const pathParts = Registry.pathParts(path);
  return pathParts.type === ElasticsearchAssetType.indexTemplate;
};

const isComponentTemplate = ({ path }: Registry.ArchiveEntry) => {
  const pathParts = Registry.pathParts(path);
  return pathParts.type === ElasticsearchAssetType.componentTemplate;
};

/**
 * installTemplatesForDataset installs one template for each dataset
 *
 * The template is currently loaded with the pkgey-package-dataset
 */

export async function installTemplateForDataset({
  pkg,
  callCluster,
  dataset,
}: {
  pkg: RegistryPackage;
  callCluster: CallESAsCurrentUser;
  dataset: Dataset;
}): Promise<TemplateRef> {
  const fields = await loadFieldsFromYaml(pkg, dataset.path);
  return installTemplate({
    callCluster,
    fields,
    dataset,
    packageVersion: pkg.version,
  });
}

export async function installTemplate({
  callCluster,
  fields,
  dataset,
  packageVersion,
}: {
  callCluster: CallESAsCurrentUser;
  fields: Field[];
  dataset: Dataset;
  packageVersion: string;
}): Promise<TemplateRef> {
  const mappings = generateMappings(processFields(fields));
  const templateName = generateTemplateName(dataset);
  let pipelineName;
  if (dataset.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation({
      pipelineName: dataset.ingest_pipeline,
      dataset,
      packageVersion,
    });
  }
  const template = getTemplate(dataset.type, templateName, mappings, pipelineName);
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
