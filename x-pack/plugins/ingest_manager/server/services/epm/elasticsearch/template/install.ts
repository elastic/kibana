/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  AssetReference,
  Dataset,
  RegistryPackage,
  IngestAssetType,
  ElasticsearchAssetType,
} from '../../../../types';
import { CallESAsCurrentUser } from '../../../../types';
import { Field, loadFieldsFromYaml } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/install';
import { generateMappings, generateTemplateName, getTemplate } from './template';
import * as Registry from '../../registry';

export const installTemplates = async (
  registryPackage: RegistryPackage,
  callCluster: CallESAsCurrentUser,
  pkgkey: string
) => {
  // install any pre-built index template assets,
  // atm, this is only the base package's global template
  installPreBuiltTemplates(pkgkey, callCluster);

  // build templates per dataset from yml files
  const datasets = registryPackage.datasets;
  if (datasets) {
    const templates = datasets.reduce<Array<Promise<AssetReference>>>((acc, dataset) => {
      acc.push(
        installTemplateForDataset({
          pkg: registryPackage,
          callCluster,
          dataset,
        })
      );
      return acc;
    }, []);
    return Promise.all(templates).then(results => results.flat());
  }
  return [];
};

// this is temporary until we update the registry to use index templates v2 structure
const installPreBuiltTemplates = async (pkgkey: string, callCluster: CallESAsCurrentUser) => {
  const templatePaths = await Registry.getArchiveInfo(pkgkey, (entry: Registry.ArchiveEntry) =>
    isTemplate(entry)
  );
  templatePaths.forEach(async path => {
    const { file } = Registry.pathParts(path);
    const templateName = file.substr(0, file.lastIndexOf('.'));
    const content = JSON.parse(Registry.getAsset(path).toString('utf8'));
    await callCluster('indices.putTemplate', {
      name: templateName,
      body: content,
    });
  });
};
const isTemplate = ({ path }: Registry.ArchiveEntry) => {
  const pathParts = Registry.pathParts(path);
  return pathParts.type === ElasticsearchAssetType.indexTemplate;
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
}): Promise<AssetReference> {
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
}): Promise<AssetReference> {
  const mappings = generateMappings(fields);
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
  await callCluster('indices.putTemplate', {
    name: templateName,
    body: template,
  });

  // The id of a template is its name
  return { id: templateName, type: IngestAssetType.IndexTemplate };
}
