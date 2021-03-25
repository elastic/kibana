/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';

import { useValues } from 'kea';

import { EuiTable } from '@elastic/eui';

import { ResultSettingsLogic } from '..';

import { ResultSettingsDisabledFieldsBody } from './result_settings_disabled_fields_body';
import { ResultSettingsDisabledFieldsHeader } from './result_settings_disabled_fields_header';
import { ResultSettingsNonTextFieldsBody } from './result_settings_non_text_fields_body';
import { ResultSettingsNonTextFieldsHeader } from './result_settings_non_text_fields_header';
import { ResultSettingsTextFieldsBody } from './result_settings_text_fields_body';
import { ResultSettingsTextFieldsHeader } from './result_settings_text_fields_header';

import './result_settings_table.scss';

export const ResultSettingsTable: React.FC = () => {
  const { schemaConflicts, textResultFields, nonTextResultFields } = useValues(ResultSettingsLogic);

  return (
    <EuiTable className="resultSettingsTable" responsive={false}>
      {!!Object.keys(textResultFields).length && (
        <>
          <ResultSettingsTextFieldsHeader />
          <ResultSettingsTextFieldsBody />
        </>
      )}
      {!!Object.keys(nonTextResultFields).length && (
        <>
          <ResultSettingsNonTextFieldsHeader />
          <ResultSettingsNonTextFieldsBody />
        </>
      )}
      {!!Object.keys(schemaConflicts).length && (
        <>
          <ResultSettingsDisabledFieldsHeader />
          <ResultSettingsDisabledFieldsBody />
        </>
      )}
    </EuiTable>
  );
};
