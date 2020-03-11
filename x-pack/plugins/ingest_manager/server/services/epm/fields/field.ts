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
 * ProcessFields takes the given fields read from yaml and expands it.
 * There are dotted fields in the field.yml like `foo.bar`. These should
 * be stored as an object inside an object and is the main purpose of this
 * preprocessing.
 *
 * Note: This function modifies the passed field param.
 */
export function processFields(fields: Fields) {
  fields.forEach((field, key) => {
    const fieldName = field.name;

    // If the field name contains a dot, it means we need to create sub objects
    if (fieldName.includes('.')) {
      // Split up the name by dots to extract first and other parts
      const nameParts = fieldName.split('.');

      // Getting first part of the name for the new field
      const newNameTop = nameParts[0];
      delete nameParts[0];

      // Put back together the parts again for the new field name
      const newName = nameParts.length === 1 ? nameParts[0] : nameParts.slice(1).join('.');

      field.name = newName;

      // Create the new field with the old field inside
      const newField: Field = {
        name: newNameTop,
        type: 'group',
        fields: [field],
      };

      // Replace the old field in the array
      fields[key] = newField;
      if (newField.fields) {
        processFields(newField.fields);
      }
    }
  });
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
