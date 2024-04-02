/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt } from '@elastic/eui';
import * as i18n from './translations';

export const DataViewErrorComponent = () => {
  return (
    <EuiEmptyPrompt
      data-test-subj="dataViewErrorComponent"
      iconType="error"
      color="danger"
      title={<h2>{i18n.DATA_VIEW_MANDATORY}</h2>}
      body={<p>{i18n.DATA_VIEW_MANDATORY_MSG}</p>}
    />
  );
};
