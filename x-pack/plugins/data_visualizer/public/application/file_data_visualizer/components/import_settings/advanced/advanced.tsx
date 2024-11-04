/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import React from 'react';

import {
  EuiFieldText,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import type { CombinedField } from '../../../../common/components/combined_fields';
import { CombinedFieldsForm } from '../../../../common/components/combined_fields';

import { CreateDataViewToolTip } from '../create_data_view_tooltip';
import { IndexSettings, IngestPipeline, Mappings } from './inputs';
import { SemanticTextInfo } from '../semantic_text_info';

interface Props {
  index: string;
  dataView: string;
  initialized: boolean;
  onIndexChange(index: string): void;
  createDataView: boolean;
  onCreateDataViewChange(): void;
  onDataViewChange(): void;
  indexSettingsString: string;
  mappingsString: string;
  pipelineString: string;
  onIndexSettingsStringChange(): void;
  onMappingsStringChange(mappings: string): void;
  onPipelineStringChange(pipeline: string): void;
  indexNameError: string;
  dataViewNameError: string;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  results: FindFileStructureResponse;
  canCreateDataView: boolean;
}

export const AdvancedSettings: FC<Props> = ({
  index,
  dataView,
  initialized,
  onIndexChange,
  createDataView,
  onCreateDataViewChange,
  onDataViewChange,
  indexSettingsString,
  mappingsString,
  pipelineString,
  onIndexSettingsStringChange,
  onMappingsStringChange,
  onPipelineStringChange,
  indexNameError,
  dataViewNameError,
  combinedFields,
  onCombinedFieldsChange,
  results,
  canCreateDataView,
}) => {
  return (
    <>
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
          onChange={(e) => onIndexChange(e.target.value)}
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

      <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
        <EuiCheckbox
          id="createDataView"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.advancedImportSettings.createDataViewLabel"
              defaultMessage="Create data view"
            />
          }
          checked={createDataView === true}
          disabled={initialized === true || canCreateDataView === false}
          onChange={onCreateDataViewChange}
        />
      </CreateDataViewToolTip>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.advancedImportSettings.dataViewNameLabel"
            defaultMessage="Data view name"
          />
        }
        isInvalid={dataViewNameError !== ''}
        error={[dataViewNameError]}
      >
        <EuiFieldText
          disabled={createDataView === false || initialized === true}
          placeholder={createDataView === true ? index : ''}
          value={dataView}
          onChange={onDataViewChange}
          isInvalid={dataViewNameError !== ''}
        />
      </EuiFormRow>

      <SemanticTextInfo results={results} />

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

      <EuiSpacer size="s" />

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
    </>
  );
};
