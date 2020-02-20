/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AssetReference, Dataset, RegistryPackage, IngestAssetType } from '../../../../types';
import { CallESAsCurrentUser } from '../../../../types';
import { Field, loadFieldsFromYaml } from '../../fields/field';
import { getPipelineNameForInstallation } from '../ingest_pipeline/ingest_pipelines';
import { generateMappings, generateTemplateName, getTemplate } from './template';

/**
 * installTemplatesForDataset installs one template for each dataset
 *
 * The template is currently loaded with the pkgey-package-dataset
 */

export async function installTemplateForDataset({
  pkg,
  callCluster,
  dataset,
  datasourceName,
}: {
  pkg: RegistryPackage;
  callCluster: CallESAsCurrentUser;
  dataset: Dataset;
  datasourceName: string;
}) {
  const fields = await loadFieldsFromYaml(pkg, dataset.name);
  return installTemplate({ callCluster, fields, dataset, datasourceName });
}

export async function installTemplate({
  callCluster,
  fields,
  dataset,
  datasourceName,
}: {
  callCluster: CallESAsCurrentUser;
  fields: Field[];
  dataset: Dataset;
  datasourceName: string;
}): Promise<AssetReference> {
  const mappings = generateMappings(fields);
  const templateName = generateTemplateName(dataset);
  let pipelineName;
  if (dataset.ingest_pipeline) {
    pipelineName = getPipelineNameForInstallation({
      pipelineName: dataset.ingest_pipeline,
      dataset,
      packageName: dataset.package,
      datasourceName,
    });
  }
  const template = getTemplate(templateName + '-*', mappings, pipelineName);
  // TODO: Check return values for errors
  await callCluster('indices.putTemplate', {
    name: templateName,
    body: template,
  });

  // The id of a template is its name
  return { id: templateName, type: IngestAssetType.IndexTemplate };
}
