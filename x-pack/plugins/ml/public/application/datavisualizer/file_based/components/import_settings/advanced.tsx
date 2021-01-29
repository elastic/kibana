/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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

import { CombinedField, CombinedFieldsForm } from '../combined_fields';
import { MLJobEditor, ML_EDITOR_MODE } from '../../../../jobs/jobs_list/components/ml_job_editor';
import { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';
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
  onMappingsStringChange(): void;
  onPipelineStringChange(): void;
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
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexNameLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.ml.fileDatavisualizer.advancedImportSettings.indexNamePlaceholder',
            {
              defaultMessage: 'index name',
            }
          )}
          value={index}
          disabled={initialized === true}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
          aria-label={i18n.translate(
            'xpack.ml.fileDatavisualizer.advancedImportSettings.indexNameAriaLabel',
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
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.createIndexPatternLabel"
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
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexPatternNameLabel"
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
  onChange(): void;
}

const IndexSettings: FC<JsonEditorProps> = ({ initialized, data, onChange }) => {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexSettingsLabel"
            defaultMessage="Index settings"
          />
        }
        fullWidth
      >
        <MLJobEditor
          mode={ML_EDITOR_MODE.JSON}
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
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.mappingsLabel"
            defaultMessage="Mappings"
          />
        }
        fullWidth
      >
        <MLJobEditor
          mode={ML_EDITOR_MODE.JSON}
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
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.ingestPipelineLabel"
            defaultMessage="Ingest pipeline"
          />
        }
        fullWidth
      >
        <MLJobEditor
          mode={ML_EDITOR_MODE.JSON}
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
