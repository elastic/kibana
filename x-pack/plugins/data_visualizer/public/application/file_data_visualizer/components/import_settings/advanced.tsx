/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import {
  EuiFieldText,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { CombinedField, CombinedFieldsForm } from '../../../common/components/combined_fields';
import { JsonEditor, EDITOR_MODE } from '../json_editor';
import { FindFileStructureResponse } from '../../../../../../file_upload/common';
const EDITOR_HEIGHT = '300px';

interface Props {
  index: string;
  indexPattern: string;
  initialized: boolean;
  onIndexChange(): void;
  createIndexPattern: boolean;
  onCreateIndexPatternChange(): void;
  onIndexPatternChange(): void;
  indexSettingsString: string;
  mappingsString: string;
  pipelineString: string;
  onIndexSettingsStringChange(): void;
  onMappingsStringChange(mappings: string): void;
  onPipelineStringChange(pipeline: string): void;
  indexNameError: string;
  indexPatternNameError: string;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  results: FindFileStructureResponse;
}

export const AdvancedSettings: FC<Props> = ({
  index,
  indexPattern,
  initialized,
  onIndexChange,
  createIndexPattern,
  onCreateIndexPatternChange,
  onIndexPatternChange,
  indexSettingsString,
  mappingsString,
  pipelineString,
  onIndexSettingsStringChange,
  onMappingsStringChange,
  onPipelineStringChange,
  indexNameError,
  indexPatternNameError,
  combinedFields,
  onCombinedFieldsChange,
  results,
}) => {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.indexNameLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.dataVisualizer.file.advancedImportSettings.indexNamePlaceholder',
            {
              defaultMessage: 'index name',
            }
          )}
          value={index}
          disabled={initialized === true}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
          aria-label={i18n.translate(
            'xpack.dataVisualizer.file.advancedImportSettings.indexNameAriaLabel',
            {
              defaultMessage: 'Index name, required field',
            }
          )}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiCheckbox
        id="createIndexPattern"
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.createIndexPatternLabel"
            defaultMessage="Create index pattern"
          />
        }
        checked={createIndexPattern === true}
        disabled={initialized === true}
        onChange={onCreateIndexPatternChange}
      />

      <EuiSpacer size="s" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.indexPatternNameLabel"
            defaultMessage="Index pattern name"
          />
        }
        isInvalid={indexPatternNameError !== ''}
        error={[indexPatternNameError]}
      >
        <EuiFieldText
          disabled={createIndexPattern === false || initialized === true}
          placeholder={createIndexPattern === true ? index : ''}
          value={indexPattern}
          onChange={onIndexPatternChange}
          isInvalid={indexPatternNameError !== ''}
        />
      </EuiFormRow>

      <CombinedFieldsForm
        mappingsString={mappingsString}
        pipelineString={pipelineString}
        onMappingsStringChange={onMappingsStringChange}
        onPipelineStringChange={onPipelineStringChange}
        combinedFields={combinedFields}
        onCombinedFieldsChange={onCombinedFieldsChange}
        results={results}
        isDisabled={initialized === true}
      />

      <EuiFlexGroup>
        <EuiFlexItem>
          <IndexSettings
            initialized={initialized}
            data={indexSettingsString}
            onChange={onIndexSettingsStringChange}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <Mappings
            initialized={initialized}
            data={mappingsString}
            onChange={onMappingsStringChange}
          />
        </EuiFlexItem>

        <EuiFlexItem>
          <IngestPipeline
            initialized={initialized}
            data={pipelineString}
            onChange={onPipelineStringChange}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </React.Fragment>
  );
};

interface JsonEditorProps {
  initialized: boolean;
  data: string;
  onChange(value: string): void;
}

const IndexSettings: FC<JsonEditorProps> = ({ initialized, data, onChange }) => {
  return (
    <React.Fragment>
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
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
};

const Mappings: FC<JsonEditorProps> = ({ initialized, data, onChange }) => {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.mappingsLabel"
            defaultMessage="Mappings"
          />
        }
        fullWidth
      >
        <JsonEditor
          mode={EDITOR_MODE.JSON}
          readOnly={initialized === true}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
};

const IngestPipeline: FC<JsonEditorProps> = ({ initialized, data, onChange }) => {
  return (
    <React.Fragment>
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
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
};
