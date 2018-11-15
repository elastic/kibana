/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiTabbedContent,
  EuiSpacer,
} from '@elastic/eui';

import { SimpleSettings } from './simple';
import { AdvancedSettings } from './advanced';

export function ImportSettings({
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
  indexPatternNameError
}) {

  const tabs = [{
    id: 'simple-settings',
    name: 'Simple',
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
        />
      </React.Fragment>
    )
  },
  {
    id: 'advanced-settings',
    name: 'Advanced',
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
        />
      </React.Fragment>
    )
  }
  ];
  return (
    <React.Fragment>
      <EuiTabbedContent
        tabs={tabs}
        initialSelectedTab={tabs[0]}
        onTabClick={() => { }}
      />
    </React.Fragment>
  );
}
