/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import React from 'react';
import * as i18n from './translations';

interface DataStreamNameProps {
  dataStreamName: string;
  onChangeDataStreamName(update: React.ChangeEvent<HTMLInputElement>): void;
  invalidName: boolean;
}
export const DataStreamName = React.memo<DataStreamNameProps>(
  ({ dataStreamName, onChangeDataStreamName, invalidName }) => {
    return (
      <EuiFormRow
        label={i18n.DATA_STREAM_NAME_LABEL}
        helpText={!invalidName ? i18n.NO_SPACES_HELP : undefined}
        isInvalid={invalidName}
        error={[i18n.NO_SPACES_HELP]}
      >
        <EuiFieldText
          name="dataStreamName"
          data-test-subj="dataStreamNameInput"
          value={dataStreamName}
          onChange={onChangeDataStreamName}
          isInvalid={invalidName}
        />
      </EuiFormRow>
    );
  }
);
DataStreamName.displayName = 'DataStreamName';
