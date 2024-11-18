/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '../../../../shared_imports';
import { NewTermsFieldsField } from './new_terms_fields_field';

interface NewTermsFieldsEditProps {
  path: string;
  fieldNames: string[];
}

export const NewTermsFieldsEdit = memo(function NewTermsFieldsEdit({
  path,
  fieldNames,
}: NewTermsFieldsEditProps): JSX.Element {
  return <UseField path={path} component={NewTermsFieldsField} componentProps={{ fieldNames }} />;
});
