/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import { EuiFormRow } from '@elastic/eui';
import { JsonEditor, EDITOR_MODE } from '../../json_editor';

const EDITOR_HEIGHT = '300px';

interface JsonEditorProps {
  initialized: boolean;
  data: string;
  onChange(value: string): void;
  indexName?: string;
}

export const IndexSettings: FC<JsonEditorProps> = ({ initialized, data, onChange }) => {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.dataVisualizer.file.advancedImportSettings.indexSettingsLabel"
          defaultMessage="Index settings"
        />
      }
      fullWidth
    >
      <JsonEditor
        mode={EDITOR_MODE.JSON}
        readOnly={initialized === true}
        value={data}
        height={EDITOR_HEIGHT}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};

export const Mappings: FC<JsonEditorProps> = ({ initialized, data, onChange, indexName }) => {
  return (
    <EuiFormRow
      label={
        indexName ? (
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.mappingsOfIndexLabel"
            defaultMessage="Mappings of index {indexName}"
            values={{ indexName }}
          />
        ) : (
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.mappingsLabel"
            defaultMessage="Mappings"
          />
        )
      }
      fullWidth
    >
      <JsonEditor
        mode={EDITOR_MODE.JSON}
        readOnly={initialized === true}
        value={data}
        height={EDITOR_HEIGHT}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};

export const IngestPipeline: FC<JsonEditorProps> = ({ initialized, data, onChange }) => {
  return (
    <EuiFormRow
      label={
        <FormattedMessage
          id="xpack.dataVisualizer.file.advancedImportSettings.ingestPipelineLabel"
          defaultMessage="Ingest pipeline"
        />
      }
      fullWidth
    >
      <JsonEditor
        mode={EDITOR_MODE.JSON}
        readOnly={initialized === true}
        value={data}
        height={EDITOR_HEIGHT}
        onChange={onChange}
      />
    </EuiFormRow>
  );
};
