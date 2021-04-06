/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormElementValidity } from './form_elements';
import { FormValidationError } from './validation_errors';

export const IndexPatternValidationCard: React.FC<{
  indexPatternValidity: FormElementValidity<FormValidationError>;
}> = ({ indexPatternValidity }) => {
  if (indexPatternValidity.validity === 'invalid') {
    return <>invalid</>;
  }
  return null;
};
