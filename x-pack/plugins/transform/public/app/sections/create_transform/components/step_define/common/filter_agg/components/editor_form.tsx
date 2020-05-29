/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiCodeEditor } from '@elastic/eui';

export const FilterEditorForm: FC = () => {
  return <EuiCodeEditor value={''} mode="json" style={{ width: '100%' }} theme="textmate" />;
};
