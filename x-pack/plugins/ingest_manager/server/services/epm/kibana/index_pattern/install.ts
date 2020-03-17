/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SavedObjectsClientContract } from 'src/core/server';
import { INDEX_PATTERN_SAVED_OBJECT_TYPE } from '../../../../constants';
import * as Registry from '../../registry';
import { loadFieldsFromYaml, Fields, Field } from '../../fields/field';
import { getPackageKeysByStatus } from '../../packages/get';
import { InstallationStatus, RegistryPackage } from '../../../../types';

interface FieldFormatMap {
  [key: string]: FieldFormatMapItem;
}
interface FieldFormatMapItem {
  id?: string;
  params?: FieldFormatParams;
}
interface FieldFormatParams {
  pattern?: string;
  inputFormat?: string;
  outputFormat?: string;
  outputPrecision?: number;
  labelTemplate?: string;
  urlTemplate?: string;
  openLinkInCurrentTab?: boolean;
}
/* this should match https://github.com/elastic/beats/blob/d9a4c9c240a9820fab15002592e5bb6db318543b/libbeat/kibana/fields_transformer.go */
interface TypeMap {
  [key: string]: string;
}
const typeMap: TypeMap = {
  binary: 'binary',
  half_float: 'number',
  scaled_float: 'number',
  float: 'number',
  integer: 'number',
  long: 'number',
  short: 'number',
  byte: 'number',
  text: 'string',
  keyword: 'string',
  '': 'string',
  geo_point: 'geo_point',
  date: 'date',
  ip: 'ip',
  boolean: 'boolean',
};

export interface IndexPatternField {
  name: string;
  type?: string;
  count: number;
  scripted: boolean;
  indexed: boolean;
  analyzed: boolean;
  searchable: boolean;
  aggregatable: boolean;
  doc_values: boolean;
  enabled?: boolean;
  script?: string;
  lang?: string;
}
export enum IndexPatternType {
  logs = 'logs',
  metrics = 'metrics',
  events = 'events',
}

export async function installIndexPatterns(
  savedObjectsClient: SavedObjectsClientContract,
  pkgkey?: string
) {
  // get all user installed packages
  const installedPackages = await getPackageKeysByStatus(
    savedObjectsClient,
    InstallationStatus.installed
  );
  // add this package
  if (pkgkey) installedPackages.push(pkgkey);

  // get each package's registry info
  const installedPackagesFetchInfoPromise = installedPackages.map(pkg => Registry.fetchInfo(pkg));
  const installedPackagesInfo = await Promise.all(installedPackagesFetchInfoPromise);

  // for each index pattern type, create an index pattern
  const indexPatternTypes = [
    IndexPatternType.logs,
    IndexPatternType.metrics,
    IndexPatternType.events,
  ];
  indexPatternTypes.forEach(async indexPatternType => {
    // if this is an update because a package is being unisntalled (no pkgkey argument passed) and no other packages are installed, remove the index pattern
    if (!pkgkey && installedPackages.length === 0) {
      try {
        await savedObjectsClient.delete(
          INDEX_PATTERN_SAVED_OBJECT_TYPE,
          `epm-ip-${indexPatternType}`
        );
      } catch (err) {
        // index pattern was probably deleted by the user already
      }
      return;
    }

    // get all dataset fields from all installed packages
    const fields = await getAllDatasetFieldsByType(installedPackagesInfo, indexPatternType);

    const kibanaIndexPattern = createIndexPattern(indexPatternType, fields);
    // create or overwrite the index pattern
    await savedObjectsClient.create(INDEX_PATTERN_SAVED_OBJECT_TYPE, kibanaIndexPattern, {
      id: `epm-ip-${indexPatternType}`,
      overwrite: true,
    });
  });
}

// loops through all given packages and returns an array
// of all fields from all datasets matching datasetType
export const getAllDatasetFieldsByType = async (
  packages: RegistryPackage[],
  datasetType: IndexPatternType
): Promise<Fields> => {
  const datasetsPromises = packages.reduce<Array<Promise<Field[]>>>((acc, pkg) => {
    if (pkg.datasets) {
      // filter out datasets by datasetType
      const matchingDatasets = pkg.datasets.filter(dataset => dataset.type === datasetType);
      matchingDatasets.forEach(dataset => acc.push(loadFieldsFromYaml(pkg, dataset.path)));
    }
    return acc;
  }, []);

  // get all the datasets for each installed package into one array
  const allDatasetFields: Fields[] = await Promise.all(datasetsPromises);
  return allDatasetFields.flat();
};

// creates or updates index pattern
export const createIndexPattern = (indexPatternType: string, fields: Fields) => {
  const { indexPatternFields, fieldFormatMap } = createIndexPatternFields(fields);

  return {
    title: `${indexPatternType}-*`,
    timeFieldName: '@timestamp',
    fields: JSON.stringify(indexPatternFields),
    fieldFormatMap: JSON.stringify(fieldFormatMap),
  };
};

// takes fields from yaml files and transforms into Kibana Index Pattern fields
// and also returns the fieldFormatMap
export const createIndexPatternFields = (
  fields: Fields
): { indexPatternFields: IndexPatternField[]; fieldFormatMap: FieldFormatMap } => {
  const dedupedFields = dedupeFields(fields);
  const flattenedFields = flattenFields(dedupedFields);
  const fieldFormatMap = createFieldFormatMap(flattenedFields);
  const transformedFields = flattenedFields.map(transformField);
  return { indexPatternFields: transformedFields, fieldFormatMap };
};

export const dedupeFields = (fields: Fields) => {
  const uniqueObj = fields.reduce<{ [name: string]: Field }>((acc, field) => {
    if (!acc[field.name]) {
      acc[field.name] = field;
    }
    return acc;
  }, {});

  return Object.values(uniqueObj);
};

/**
 * search through fields with field's path property
 * returns undefined if field not found or field is not a leaf node
 * @param  allFields fields to search
 * @param  path dot separated path from field.path
 */
export const findFieldByPath = (allFields: Fields, path: string): Field | undefined => {
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

export const transformField = (field: Field, i: number, fields: Fields): IndexPatternField => {
  const newField: IndexPatternField = {
    name: field.name,
    count: field.count ?? 0,
    scripted: false,
    indexed: field.index ?? true,
    analyzed: field.analyzed ?? false,
    searchable: field.searchable ?? true,
    aggregatable: field.aggregatable ?? true,
    doc_values: field.doc_values ?? true,
  };

  // if type exists, check if it exists in the map
  if (field.type) {
    // if no type match type is not set (undefined)
    if (typeMap[field.type]) {
      newField.type = typeMap[field.type];
    }
    // if type isn't set, default to string
  } else {
    newField.type = 'string';
  }

  if (newField.type === 'binary') {
    newField.aggregatable = false;
    newField.analyzed = false;
    newField.doc_values = field.doc_values ?? false;
    newField.indexed = false;
    newField.searchable = false;
  }

  if (field.type === 'object' && field.hasOwnProperty('enabled')) {
    const enabled = field.enabled ?? true;
    newField.enabled = enabled;
    if (!enabled) {
      newField.aggregatable = false;
      newField.analyzed = false;
      newField.doc_values = false;
      newField.indexed = false;
      newField.searchable = false;
    }
  }

  if (field.type === 'text') {
    newField.aggregatable = false;
  }

  if (field.hasOwnProperty('script')) {
    newField.scripted = true;
    newField.script = field.script;
    newField.lang = 'painless';
    newField.doc_values = false;
  }

  return newField;
};

/**
 * flattenFields
 *
 * flattens fields and renames them with a path of the parent names
 */

export const flattenFields = (allFields: Fields): Fields => {
  const flatten = (fields: Fields): Fields =>
    fields.reduce<Field[]>((acc, field) => {
      // recurse through nested fields
      if (field.type === 'group' && field.fields?.length) {
        // skip if field.enabled is not explicitly set to false
        if (!field.hasOwnProperty('enabled') || field.enabled === true) {
          acc = renameAndFlatten(field, field.fields, [...acc]);
        }
      } else {
        // handle alias type fields
        if (field.type === 'alias' && field.path) {
          const foundField = findFieldByPath(allFields, field.path);
          // if aliased leaf field is found copy its props over except path and name
          if (foundField) {
            const { path, name } = field;
            field = { ...foundField, path, name };
          }
        }
        // add field before going through multi_fields because we still want to add the parent field
        acc.push(field);

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

export const createFieldFormatMap = (fields: Fields): FieldFormatMap =>
  fields.reduce<FieldFormatMap>((acc, field) => {
    if (field.format || field.pattern) {
      const fieldFormatMapItem: FieldFormatMapItem = {};
      if (field.format) {
        fieldFormatMapItem.id = field.format;
      }
      const params = getFieldFormatParams(field);
      if (Object.keys(params).length) fieldFormatMapItem.params = params;
      acc[field.name] = fieldFormatMapItem;
    }
    return acc;
  }, {});

const getFieldFormatParams = (field: Field): FieldFormatParams => {
  const params: FieldFormatParams = {};
  if (field.pattern) params.pattern = field.pattern;
  if (field.input_format) params.inputFormat = field.input_format;
  if (field.output_format) params.outputFormat = field.output_format;
  if (field.output_precision) params.outputPrecision = field.output_precision;
  if (field.label_template) params.labelTemplate = field.label_template;
  if (field.url_template) params.urlTemplate = field.url_template;
  if (field.open_link_in_current_tab) params.openLinkInCurrentTab = field.open_link_in_current_tab;
  return params;
};
