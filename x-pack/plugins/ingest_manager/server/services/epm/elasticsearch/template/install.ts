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
import { Field, Fields, loadFieldsFromYaml, processFields } from '../../fields/field';
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
  await callCluster('indices.putTemplate', {
    name: templateName,
    body: template,
  });

  // The id of a template is its name
  return { id: templateName, type: IngestAssetType.IndexTemplate };
}

/**
 * flattenAndPreprocessFields
 *
 * flattens fields and renames them with a path of the parent names
 * also does some additional preprocessing of the fields for use in index templates
 *
 * There is a very similar function in kibana/index_pattern/install, at some point it
 * might be useful to pull out the similarities and put them into a generic version in
 * fields/field.
 */

export const flattenAndPreprocessFields = (allFields: Fields): Fields => {
  const flatten = (fields: Fields): Fields =>
    fields.reduce<Field[]>((acc, field) => {
      // recurse through nested fields
      if (field.type === 'group' && field.fields?.length) {
        // skip if field.enabled is explicitly set to false
        if (!field.hasOwnProperty('enabled') || field.enabled === true) {
          acc = renameAndFlatten(field, field.fields, [...acc]);
        }
      } else {
        // handle alias type fields
        if (field.type === 'alias' && field.path) {
          const foundField = findFieldByPath(allFields, field.path);
          // if aliased leaf field is found, this is a valid alias field
          if (foundField) {
            acc.push(field);
          }
        } else {
          acc.push(field);
        }

        // for each field in multi_field add new field
        if (field.multi_fields?.length) {
          acc = renameAndFlatten(field, field.multi_fields, [...acc]);
        }
      }
      return acc;
    }, []);

  // helper function to call flatten() and rename the fields
  const renameAndFlatten = (field: Field, fields: Fields, acc: Fields): Fields => {
    const flattenedFields = flatten(fields);
    flattenedFields.forEach(nestedField => {
      acc.push({
        ...nestedField,
        name: `${field.name}.${nestedField.name}`,
      });
    });
    return acc;
  };

  return flatten(allFields);
};

/**
 * search through fields with field's path property
 * returns undefined if field not found or field is not a leaf node
 * @param  allFields fields to search
 * @param  path dot separated path from field.path
 */
const findFieldByPath = (allFields: Fields, path: string): Field | undefined => {
  const pathParts = path.split('.');
  return getField(allFields, pathParts);
};

const getField = (fields: Fields, pathNames: string[]): Field | undefined => {
  if (!pathNames.length) return undefined;
  // get the first rest of path names
  const [name, ...restPathNames] = pathNames;
  for (const field of fields) {
    if (field.name === name) {
      // check field's fields, passing in the remaining path names
      if (field.fields && field.fields.length > 0) {
        return getField(field.fields, restPathNames);
      }
      // no nested fields to search, but still more names - not found
      if (restPathNames.length) {
        return undefined;
      }
      return field;
    }
  }
  return undefined;
};
