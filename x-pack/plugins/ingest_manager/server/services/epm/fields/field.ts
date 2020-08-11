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
  dynamic?: 'strict' | boolean;
  include_in_parent?: boolean;
  include_in_root?: boolean;

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
 */
export function expandFields(fields: Fields): Fields {
  const newFields: Fields = [];

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
      const nestedFieldName = nameParts.slice(1).join('.');

      // keep all properties of the original field, but give it the shortened name
      const nestedField = { ...field, name: nestedFieldName };

      // create a new field of type group with the original field in the fields array
      const groupField: Field = {
        name: groupFieldName,
        type: 'group',
        fields: expandFields([nestedField]),
      };
      // Replace the original field in the array with the new one
      newFields.push(groupField);
    } else {
      // even if this field doesn't have dots to expand, its child fields further down the tree might
      const newField = { ...field };
      if (newField.fields) {
        newField.fields = expandFields(newField.fields);
      }
      newFields.push(newField);
    }
  });
  return newFields;
}
/**
 * dedupFields takes the given fields and merges sibling fields with the
 * same name together.
 * These can result from expandFields when the input contains dotted field
 * names that share parts of their hierarchy.
 */
function dedupFields(fields: Fields): Fields {
  const dedupedFields: Fields = [];
  fields.forEach((field) => {
    const found = dedupedFields.find((f) => {
      return f.name === field.name;
    });
    if (found) {
      // remove name, type, and fields from `field` variable so we avoid merging them into `found`
      const { name, type, fields: nestedFields, ...importantFieldProps } = field;
      /**
       * There are a couple scenarios this if is trying to account for:
       * Example 1
       *  - name: a.b
       *  - name: a
       *  In this scenario found will be `group` and field could be either `object` or `nested`
       * Example 2
       *  - name: a
       *  - name: a.b
       *  In this scenario found could be `object` or `nested` and field will be group
       */
      if (
        // only merge if found is a group and field is object, nested, or group.
        // Or if found is object, or nested, and field is a group.
        // This is to avoid merging two objects, or two nested, or object with a nested.

        // we do not need to check for group-nested in this part because `field` will never have group-nested
        // it can only exist on `found`
        (found.type === 'group' &&
          (field.type === 'object' || field.type === 'nested' || field.type === 'group')) ||
        // as part of the loop we will be marking found.type as group-nested so found could be group-nested if it was
        // already processed. If we had an explicit definition of nested, and it showed up before a descendant field:
        // - name: a
        //   type: nested
        // - name: a.b
        //   type: keyword
        // then found.type will be nested and not group-nested because it won't have any fields yet until a.b is processed
        ((found.type === 'object' || found.type === 'nested' || found.type === 'group-nested') &&
          field.type === 'group')
      ) {
        // if the new field has properties let's dedup and concat them with the already existing found variable in
        // the array
        if (field.fields) {
          // if the found type was object or nested it won't have a fields array so let's initialize it
          if (!found.fields) {
            found.fields = [];
          }
          found.fields = dedupFields(found.fields.concat(field.fields));
        }

        // if found already had fields or got new ones from the new field coming in we need to assign the right
        // type to it
        if (found.fields) {
          // If this field is supposed to be `nested` and we have fields, we need to preserve the fact that it is
          // supposed to be `nested` for when the template is actually generated
          if (found.type === 'nested' || field.type === 'nested') {
            found.type = 'group-nested';
          } else if (found.type === 'object') {
            found.type = 'group';
          }
          // found.type could be group-nested or group, in those cases just leave it
        }
        // we need to merge in other properties (like `dynamic`) that might exist
        Object.assign(found, importantFieldProps);
        // if `field.type` wasn't group object or nested, then there's a conflict in types, so lets ignore it
      } else {
        // only `group`, `object`, and `nested` fields can be merged in this way
        // XXX: don't abort on error for now
        // see discussion in https://github.com/elastic/kibana/pull/59894
        // throw new Error(
        //   "Can't merge fields " + JSON.stringify(found) + ' and ' + JSON.stringify(field)
        // );
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

/** validateFields takes the given fields and verifies:
 *
 * - all fields of type alias point to existing fields.
 * - all fields of type array have a property object_type
 *
 * Invalid fields are silently removed.
 */

function validateFields(fields: Fields, allFields: Fields): Fields {
  const validatedFields: Fields = [];

  fields.forEach((field) => {
    if (field.type === 'alias') {
      if (field.path && getField(allFields, field.path.split('.'))) {
        validatedFields.push(field);
      }
    } else if (field.type === 'array') {
      if (field.object_type) {
        validatedFields.push(field);
      }
    } else {
      validatedFields.push(field);
    }
    if (field.fields) {
      field.fields = validateFields(field.fields, allFields);
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
  const expandedFields = expandFields(fields);
  const dedupedFields = dedupFields(expandedFields);
  return validateFields(dedupedFields, dedupedFields);
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
