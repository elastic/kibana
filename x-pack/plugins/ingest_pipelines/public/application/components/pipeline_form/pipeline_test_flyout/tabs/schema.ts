/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FormSchema, fieldValidators } from '../../../../../shared_imports';

const { emptyField, isJsonField } = fieldValidators;

// TODO move to lib?
const stringifyJson = (json: { [key: string]: unknown }): string =>
  Array.isArray(json) ? JSON.stringify(json, null, 2) : '[\n\n]';

const parseJson = (jsonString: string): object[] => {
  let parsedJSON: any;

  try {
    parsedJSON = JSON.parse(jsonString);

    if (!Array.isArray(parsedJSON)) {
      // Convert object to array
      parsedJSON = [parsedJSON];
    }
  } catch {
    parsedJSON = [];
  }

  return parsedJSON;
};

export const documentsSchema: FormSchema = {
  // TODO validation: at least one document required
  documents: {
    label: i18n.translate('xpack.ingestPipelines.debugForm.documentsFieldLabel', {
      defaultMessage: 'Documents',
    }),
    serializer: parseJson,
    deserializer: stringifyJson,
    validations: [
      {
        validator: emptyField(
          i18n.translate('xpack.ingestPipelines.debugForm.documentsRequiredError', {
            defaultMessage: 'Documents are required.',
          })
        ),
      },
      {
        validator: isJsonField(
          i18n.translate('xpack.ingestPipelines.debugForm.documentsJsonError', {
            defaultMessage: 'The documents JSON is not valid.',
          })
        ),
      },
    ],
  },
};
