/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { safeLoad } from 'js-yaml';
import { RegistryPackage } from '../../../types';
import { getAssetsData } from '../packages/assets';

// This should become a copy of https://github.com/elastic/beats/blob/d9a4c9c240a9820fab15002592e5bb6db318543b/libbeat/mapping/field.go#L39
export interface Field {
  name: string;
  type?: string;
  description?: string;
  format?: string;
  fields?: Fields;
  enabled?: boolean;
  path?: string;
  index?: boolean;
  required?: boolean;
  multi_fields?: Fields;
  doc_values?: boolean;
  copy_to?: string;
  analyzer?: string;
  search_analyzer?: string;
  ignore_above?: number;
  object_type?: string;
  scaling_factor?: number;

  // Kibana specific
  analyzed?: boolean;
  count?: number;
  searchable?: boolean;
  aggregatable?: boolean;
  script?: string;
  readFromDocValues?: boolean;

  // Kibana field format params
  pattern?: string;
  input_format?: string;
  output_format?: string;
  output_precision?: number;
  label_template?: string;
  url_template?: string;
  open_link_in_current_tab?: boolean;
}

export type Fields = Field[];

/**
 * expandFields takes the given fields read from yaml and expands them.
 * There are dotted fields in the field.yml like `foo.bar`. These should
 * be stored as an field within a 'group' field.
 *
 * Note: This function modifies the passed fields array.
 */
export function expandFields(fields: Fields) {
  fields.forEach((field, key) => {
    const fieldName = field.name;

    // If the field name contains a dot, it means we need to
    // - take the first part of the name
    // - create a field of type 'group' with this first part
    // - put the original field, named with the rest of the original name in the fields property of the new group field
    if (fieldName.includes('.')) {
      // Split up the name by dots to extract first and other parts
      const nameParts = fieldName.split('.');

      // Getting first part of the name for the new field
      const groupFieldName = nameParts[0];

      // Put back together the parts again for the new field name
      const restFieldName = nameParts.slice(1).join('.');

      // keep all properties of the original field, but give it the shortened name
      field.name = restFieldName;

      // create a new field of type group with the original field in the fields array
      const groupField: Field = {
        name: groupFieldName,
        type: 'group',
        fields: [field],
      };
      // check child fields further down the tree
      if (groupField.fields) {
        expandFields(groupField.fields);
      }
      // Replace the original field in the array with the new one
      fields[key] = groupField;
    } else {
      // even if this field doesn't have dots to expand, its child fields further down the tree might
      if (field.fields) {
        expandFields(field.fields);
      }
    }
  });
}
/**
 * dedupFields takes the given fields and merges sibling fields with the
 * same name together.
 * These can result from expandFields when the input contains dotted field
 * names that share parts of their hierarchy.
 */
function dedupFields(fields: Fields): Fields {
  const dedupedFields: Fields = [];
  fields.forEach(field => {
    const found = dedupedFields.find(f => {
      return f.name === field.name;
    });
    if (found) {
      if (found.type === 'group' && field.type === 'group' && found.fields && field.fields) {
        found.fields = dedupFields(found.fields.concat(field.fields));
      } else {
        // only 'group' fields can be merged in this way
        throw new Error(
          "Can't merge fields " + JSON.stringify(found) + ' and ' + JSON.stringify(field)
        );
      }
    } else {
      if (field.fields) {
        field.fields = dedupFields(field.fields);
      }
      dedupedFields.push(field);
    }
  });
  return dedupedFields;
}

/** validateAliasFields takes the given fields and verifies that all fields of type
 * alias point to existing fields.
 *
 * Invalid alias fields are silently removed.
 */

function validateAliasFields(fields: Fields, allFields: Fields): Fields {
  const validatedFields: Fields = [];

  fields.forEach(field => {
    if (field.type === 'alias') {
      if (field.path && getField(allFields, field.path.split('.'))) {
        validatedFields.push(field);
      }
    } else {
      validatedFields.push(field);
    }
    if (field.fields) {
      field.fields = validateAliasFields(field.fields, allFields);
    }
  });
  return validatedFields;
}

export const getField = (fields: Fields, pathNames: string[]): Field | undefined => {
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

export function processFields(fields: Fields): Fields {
  expandFields(fields);
  const dedupedFields = dedupFields(fields);
  return validateAliasFields(dedupedFields, dedupedFields);
}

const isFields = (path: string) => {
  return path.includes('/fields/');
};

/**
 * loadFieldsFromYaml
 *
 * Gets all field files, optionally filtered by dataset, extracts .yml files, merges them together
 */

export const loadFieldsFromYaml = async (
  pkg: RegistryPackage,
  datasetName?: string
): Promise<Field[]> => {
  // Fetch all field definition files
  const fieldDefinitionFiles = await getAssetsData(pkg, isFields, datasetName);
  return fieldDefinitionFiles.reduce<Field[]>((acc, file) => {
    // Make sure it is defined as it is optional. Should never happen.
    if (file.buffer) {
      const tmpFields = safeLoad(file.buffer.toString());
      // safeLoad() returns undefined for empty files, we don't want that
      if (tmpFields) {
        acc = acc.concat(tmpFields);
      }
    }
    return acc;
  }, []);
};
