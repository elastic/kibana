/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';

import { FormattedMessage } from '@kbn/i18n/react';
import { i18n } from '@kbn/i18n';
import { EuiCode } from '@elastic/eui';

import { FormSchema, fieldValidators, ValidationFuncArg } from '../../../../../../shared_imports';
import { parseJson, stringifyJson } from '../../../../../lib';

const { emptyField, isJsonField } = fieldValidators;

export const documentsSchema: FormSchema = {
  documents: {
    label: i18n.translate(
      'xpack.ingestPipelines.testPipelineFlyout.documentsForm.documentsFieldLabel',
      {
        defaultMessage: 'Documents',
      }
    ),
    helpText: (
      <FormattedMessage
        id="xpack.ingestPipelines.form.onFailureFieldHelpText"
        defaultMessage="Use JSON format: {code}"
        values={{
          code: (
            <EuiCode>
              {JSON.stringify([
                {
                  _index: 'index',
                  _id: 'id',
                  _source: {
                    foo: 'bar',
                  },
                },
              ])}
            </EuiCode>
          ),
        }}
      />
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
