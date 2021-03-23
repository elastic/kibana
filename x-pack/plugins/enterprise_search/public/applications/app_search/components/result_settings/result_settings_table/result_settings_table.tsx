/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { EuiTable } from '@elastic/eui';

import { ResultSettingsTextFieldsBody } from './result_settings_text_fields_body';
import { ResultSettingsTextFieldsHeader } from './result_settings_text_fields_header';

export const ResultSettingsTable: React.FC = () => {
  return (
    <EuiTable className="resultSettingsTable" responsive={false}>
      <ResultSettingsTextFieldsHeader />
      <ResultSettingsTextFieldsBody />
    </EuiTable>
  );
};
