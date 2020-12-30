/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React, { FC } from 'react';

import { EuiTabbedContent, EuiSpacer } from '@elastic/eui';

import { SimpleSettings } from './simple';
import { AdvancedSettings } from './advanced';
import { CombinedField } from '../combined_fields';
import { FindFileStructureResponse } from '../../../../../../common/types/file_datavisualizer';

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

export const ImportSettings: FC<Props> = ({
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
  const tabs = [
    {
      id: 'simple-settings',
      name: i18n.translate('xpack.ml.fileDatavisualizer.importSettings.simpleTabName', {
        defaultMessage: 'Simple',
      }),
      content: (
        <React.Fragment>
          <EuiSpacer size="m" />

          <SimpleSettings
            index={index}
            initialized={initialized}
            onIndexChange={onIndexChange}
            createIndexPattern={createIndexPattern}
            onCreateIndexPatternChange={onCreateIndexPatternChange}
            indexNameError={indexNameError}
            combinedFields={combinedFields}
          />
        </React.Fragment>
      ),
    },
    {
      id: 'advanced-settings',
      name: i18n.translate('xpack.ml.fileDatavisualizer.importSettings.advancedTabName', {
        defaultMessage: 'Advanced',
      }),
      content: (
        <React.Fragment>
          <EuiSpacer size="m" />

          <AdvancedSettings
            index={index}
            indexPattern={indexPattern}
            initialized={initialized}
            onIndexChange={onIndexChange}
            createIndexPattern={createIndexPattern}
            onCreateIndexPatternChange={onCreateIndexPatternChange}
            onIndexPatternChange={onIndexPatternChange}
            indexSettingsString={indexSettingsString}
            mappingsString={mappingsString}
            pipelineString={pipelineString}
            onIndexSettingsStringChange={onIndexSettingsStringChange}
            onMappingsStringChange={onMappingsStringChange}
            onPipelineStringChange={onPipelineStringChange}
            indexNameError={indexNameError}
            indexPatternNameError={indexPatternNameError}
            combinedFields={combinedFields}
            onCombinedFieldsChange={onCombinedFieldsChange}
            results={results}
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
