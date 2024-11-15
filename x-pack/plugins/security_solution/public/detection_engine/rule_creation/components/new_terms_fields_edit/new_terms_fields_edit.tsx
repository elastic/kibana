/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { DataViewFieldBase } from '@kbn/es-query';
import { UseField } from '../../../../shared_imports';
import { NewTermsFieldsEditField } from './new_terms_fields_edit_field';

interface NewTermsFieldsEditProps {
  path: string;
  browserFields: DataViewFieldBase[];
}

export function NewTermsFieldsEdit({ path, browserFields }: NewTermsFieldsEditProps): JSX.Element {
  const componentProps = useMemo(() => ({ browserFields }), [browserFields]);

  return (
    <UseField path={path} component={NewTermsFieldsEditField} componentProps={componentProps} />
  );
}
