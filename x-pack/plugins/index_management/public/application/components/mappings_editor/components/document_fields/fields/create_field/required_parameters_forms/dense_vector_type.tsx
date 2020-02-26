/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { FormRow, UseField, Field } from '../../../../../shared_imports';
import { getFieldConfig } from '../../../../../lib';

export const DenseVectorRequiredParameters = () => {
  const { label } = getFieldConfig('dims');

  return (
    <FormRow
      title={<h3>{label}</h3>}
      description={i18n.translate('xpack.idxMgmt.mappingsEditor.denseVector.dimsFieldDescription', {
        defaultMessage:
          'Each document’s dense vector is encoded as a binary doc value. Its size in bytes is equal to 4 * dimensions + 4.',
      })}
    >
      <UseField path="dims" config={getFieldConfig('dims')} component={Field} />
    </FormRow>
  );
};
