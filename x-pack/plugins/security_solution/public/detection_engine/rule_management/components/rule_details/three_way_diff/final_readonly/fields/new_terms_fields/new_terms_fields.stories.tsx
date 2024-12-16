/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NewTermsFieldsReadOnly } from './new_terms_fields';

export default {
  component: NewTermsFieldsReadOnly,
  title:
    'Rule Management/Prebuilt Rules/Upgrade Flyout/ThreeWayDiff/FieldReadOnly/new_terms_fields',
};

export const Default = () => <NewTermsFieldsReadOnly newTermsFields={['user.name', 'source.ip']} />;
