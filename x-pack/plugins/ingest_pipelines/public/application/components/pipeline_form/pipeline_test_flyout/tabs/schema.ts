/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';

import { FormSchema, fieldValidators, ValidationFuncArg } from '../../../../../shared_imports';
import { parseJson, stringifyJson } from '../../../../lib';

const { emptyField, isJsonField } = fieldValidators;

export const documentsSchema: FormSchema = {
  documents: {
    label: i18n.translate(
      'xpack.ingestPipelines.testPipelineFlyout.documentsForm.documentsFieldLabel',
      {
        defaultMessage: 'Documents',
      }
    ),
    serializer: parseJson,
    deserializer: stringifyJson,
    validations: [
      {
        validator: emptyField(
          i18n.translate(
            'xpack.ingestPipelines.testPipelineFlyout.documentsForm.noDocumentsError',
            {
              defaultMessage: 'Documents are required.',
            }
          )
        ),
      },
      {
        validator: isJsonField(
          i18n.translate(
            'xpack.ingestPipelines.testPipelineFlyout.documentsForm.documentsJsonError',
            {
              defaultMessage: 'The documents JSON is not valid.',
            }
          )
        ),
      },
      {
        validator: ({ value }: ValidationFuncArg<any, any>) => {
          const parsedJSON = JSON.parse(value);

          if (!parsedJSON.length) {
            return {
              message: i18n.translate(
                'xpack.ingestPipelines.testPipelineFlyout.documentsForm.oneDocumentRequiredError',
                {
                  defaultMessage: 'At least one document is required.',
                }
              ),
            };
          }
        },
      },
    ],
  },
};
