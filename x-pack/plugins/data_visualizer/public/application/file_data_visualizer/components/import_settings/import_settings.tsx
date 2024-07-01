/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { FC } from 'react';
import { useEffect } from 'react';
import React from 'react';

import { EuiTabbedContent, EuiSpacer, EuiSwitch } from '@elastic/eui';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { SimpleSettings } from './simple';
import { AdvancedSettings } from './advanced';
import type { CombinedField } from '../../../common/components/combined_fields';
import { useDataVisualizerKibana } from '../../../kibana_context';
import { AdvancedWithExistingIndexSettings } from './advanced/advanced_with_existing_index';

interface Props {
  index: string;
  dataView: string;
  initialized: boolean;
  onIndexChange(i: string): void;
  createDataView: boolean;
  onCreateDataViewChange(): void;
  onDataViewChange(): void;
  indexSettingsString: string;
  mappingsString: string;
  originalMappingsString: string;
  originalPipelineString: string;
  createNewPipeline: boolean;
  onCreateNewPipelineChange: (b: boolean) => void;
  pipelineString: string;
  onIndexSettingsStringChange(): void;
  onMappingsStringChange(mappings: string): void;
  onPipelineStringChange(pipeline: string): void;
  onPipelineIdChange: (id: string | null) => void;
  pipelineId: string | null;
  indexNameError: string;
  dataViewNameError: string;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  results: FindFileStructureResponse;
  reuseIndex: boolean;
  setReuseIndex: (b: boolean) => void;
}

export const ImportSettings: FC<Props> = ({
  index,
  dataView,
  initialized,
  onIndexChange,
  createDataView,
  onCreateDataViewChange,
  onDataViewChange,
  indexSettingsString,
  mappingsString,
  originalMappingsString,
  originalPipelineString,
  createNewPipeline,
  onCreateNewPipelineChange,
  pipelineString,
  onIndexSettingsStringChange,
  onMappingsStringChange,
  onPipelineStringChange,
  pipelineId,
  onPipelineIdChange,
  indexNameError,
  dataViewNameError,
  combinedFields,
  onCombinedFieldsChange,
  results,
  reuseIndex,
  setReuseIndex,
}) => {
  const {
    services: {
      application: { capabilities },
    },
  } = useDataVisualizerKibana();

  useEffect(() => {
    if (reuseIndex === false) {
      onMappingsStringChange(originalMappingsString);
    }
  }, [onMappingsStringChange, originalMappingsString, reuseIndex]);

  const canCreateDataView =
    capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true;

  const tabs = [
    {
      id: 'simple-settings',
      name: i18n.translate('xpack.dataVisualizer.file.importSettings.simpleTabName', {
        defaultMessage: 'Simple',
      }),
      content: (
        <>
          <EuiSpacer size="m" />

          <SimpleSettings
            index={index}
            initialized={initialized}
            onIndexChange={onIndexChange}
            createDataView={createDataView}
            onCreateDataViewChange={onCreateDataViewChange}
            indexNameError={indexNameError}
            combinedFields={combinedFields}
            canCreateDataView={canCreateDataView}
          />
        </>
      ),
    },
    {
      id: 'advanced-settings',
      name: i18n.translate('xpack.dataVisualizer.file.importSettings.advancedTabName', {
        defaultMessage: 'Advanced',
      }),
      content: (
        <>
          <EuiSpacer size="m" />
          <EuiSwitch
            compressed
            label="Import to existing index"
            checked={reuseIndex}
            onChange={(e) => setReuseIndex(e.target.checked)}
          />
          <EuiSpacer size="m" />
          {reuseIndex ? (
            <AdvancedWithExistingIndexSettings
              index={index}
              initialized={initialized}
              onIndexChange={onIndexChange}
              mappingsString={mappingsString}
              pipelineString={pipelineString}
              onMappingsStringChange={onMappingsStringChange}
              onPipelineStringChange={onPipelineStringChange}
              pipelineId={pipelineId}
              onPipelineIdChange={onPipelineIdChange}
              indexNameError={indexNameError}
              originalMappingsString={originalMappingsString}
              originalPipelineString={originalPipelineString}
              createNewPipeline={createNewPipeline}
              onCreateNewPipelineChange={onCreateNewPipelineChange}
            />
          ) : (
            <AdvancedSettings
              index={index}
              dataView={dataView}
              initialized={initialized}
              onIndexChange={onIndexChange}
              createDataView={createDataView}
              onCreateDataViewChange={onCreateDataViewChange}
              onDataViewChange={onDataViewChange}
              indexSettingsString={indexSettingsString}
              mappingsString={mappingsString}
              pipelineString={pipelineString}
              onIndexSettingsStringChange={onIndexSettingsStringChange}
              onMappingsStringChange={onMappingsStringChange}
              onPipelineStringChange={onPipelineStringChange}
              indexNameError={indexNameError}
              dataViewNameError={dataViewNameError}
              combinedFields={combinedFields}
              onCombinedFieldsChange={onCombinedFieldsChange}
              results={results}
              canCreateDataView={canCreateDataView}
            />
          )}
        </>
      ),
    },
  ];
  return <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} onTabClick={() => {}} />;
};
