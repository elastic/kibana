/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';

import { SimpleSettings } from './simple';
import { AdvancedSettings } from './advanced';
import { CombinedField } from '../../../common/components/combined_fields';
import { FindFileStructureResponse } from '../../../../../../file_upload/common';
import { useDataVisualizerKibana } from '../../../kibana_context';

interface Props {
  index: string;
  dataView: string;
  initialized: boolean;
  onIndexChange(): void;
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
  pipelineString,
  onIndexSettingsStringChange,
  onMappingsStringChange,
  onPipelineStringChange,
  indexNameError,
  dataViewNameError,
  combinedFields,
  onCombinedFieldsChange,
  results,
}) => {
  const {
    services: {
      application: { capabilities },
    },
  } = useDataVisualizerKibana();

  const canCreateDataView =
    capabilities.savedObjectsManagement.edit === true || capabilities.indexPatterns.save === true;

  const tabs = [
    {
      id: 'simple-settings',
      name: i18n.translate('xpack.dataVisualizer.file.importSettings.simpleTabName', {
        defaultMessage: 'Simple',
      }),
      content: (
        <React.Fragment>
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
        </React.Fragment>
      ),
    },
    {
      id: 'advanced-settings',
      name: i18n.translate('xpack.dataVisualizer.file.importSettings.advancedTabName', {
        defaultMessage: 'Advanced',
      }),
      content: (
        <React.Fragment>
          <EuiSpacer size="m" />

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
        </React.Fragment>
      ),
    },
  ];
  return (
    <React.Fragment>
      <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} onTabClick={() => {}} />
    </React.Fragment>
  );
};
