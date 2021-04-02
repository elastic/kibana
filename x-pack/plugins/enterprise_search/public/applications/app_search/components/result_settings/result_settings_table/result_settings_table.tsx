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

import { DisabledFieldsBody } from './disabled_fields_body';
import { DisabledFieldsHeader } from './disabled_fields_header';
import { NonTextFieldsBody } from './non_text_fields_body';
import { NonTextFieldsHeader } from './non_text_fields_header';
import { TextFieldsBody } from './text_fields_body';
import { TextFieldsHeader } from './text_fields_header';

import './result_settings_table.scss';

export const ResultSettingsTable: React.FC = () => {
  const { schemaConflicts, textResultFields, nonTextResultFields } = useValues(ResultSettingsLogic);

  // TODO This table currently has mutiple theads, which is invalid html. We could change these subheaders to be EuiTableRow instead of EuiTableHeader
  // to alleviate the issue.
  return (
    <EuiTable className="resultSettingsTable" responsive={false}>
      {!!Object.keys(textResultFields).length && (
        <>
          <TextFieldsHeader />
          <TextFieldsBody />
        </>
      )}
      {!!Object.keys(nonTextResultFields).length && (
        <>
          <NonTextFieldsHeader />
          <NonTextFieldsBody />
        </>
      )}
      {!!Object.keys(schemaConflicts).length && (
        <>
          <DisabledFieldsHeader />
          <DisabledFieldsBody />
        </>
      )}
    </EuiTable>
  );
};
