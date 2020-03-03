/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EditFieldFormRow } from '../fields/edit_field';

export const SplitQueriesOnWhitespaceParameter = () => (
  <EditFieldFormRow
    title={i18n.translate('xpack.idxMgmt.mappingsEditor.splitQueriesOnWhitespaceFieldTitle', {
      defaultMessage: 'Split queries on whitespace',
    })}
    description={i18n.translate(
      'xpack.idxMgmt.mappingsEditor.splitQueriesOnWhitespaceDescription',
      {
        defaultMessage:
          'Full text queries will split the input on whitespace when building a query for this field.',
      }
    )}
    formFieldPath="split_queries_on_whitespace"
  />
);
