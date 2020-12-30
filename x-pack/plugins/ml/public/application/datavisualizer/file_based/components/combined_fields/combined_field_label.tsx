/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiText } from '@elastic/eui';

import { CombinedField } from './types';

export function CombinedFieldLabel({ combinedField }: { combinedField: CombinedField }) {
  return <EuiText size="s">{getCombinedFieldLabel(combinedField)}</EuiText>;
}

function getCombinedFieldLabel(combinedField: CombinedField) {
  return `${combinedField.fieldNames.join(combinedField.delimiter)} => ${
    combinedField.combinedFieldName
  } (${combinedField.mappingType})`;
}
