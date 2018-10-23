/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React from 'react';

import {
  EuiFieldText,
  EuiSpacer,
  EuiFormRow,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { MLJobEditor, EDITOR_MODE } from '../../../jobs/jobs_list/components/ml_job_editor';
const EDITOR_HEIGHT = '300px';

export function AdvancedSettings({
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
}) {

  return (
    <React.Fragment>
      <EuiFormRow
        label="Index name"
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder="index name"
          value={index}
          disabled={(initialized === true)}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
        />
      </EuiFormRow>

      <EuiCheckbox
        id="createIndexPattern"
        label="Create index pattern"
        checked={(createIndexPattern === true)}
        disabled={(initialized === true)}
        onChange={onCreateIndexPatternChange}
      />

      <EuiSpacer size="s" />

      <EuiFormRow
        label="Index pattern name"
        disabled={(createIndexPattern === false || initialized === true)}
        isInvalid={indexPatternNameError !== ''}
        error={[indexPatternNameError]}
      >
        <EuiFieldText
          disabled={(createIndexPattern === false || initialized === true)}
          placeholder={(createIndexPattern === true) ? index : ''}
          value={indexPattern}
          onChange={onIndexPatternChange}
          isInvalid={indexPatternNameError !== ''}
        />
      </EuiFormRow>

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
}

function IndexSettings({ initialized, data, onChange }) {
  return (
    <React.Fragment>
      <EuiFormRow
        label="Index settings"
        disabled={(initialized === true)}
        fullWidth
      >
        <MLJobEditor
          mode={EDITOR_MODE.JSON}
          readOnly={(initialized === true)}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
}

function Mappings({ initialized, data, onChange }) {
  return (
    <React.Fragment>
      <EuiFormRow
        label="Mappings"
        disabled={(initialized === true)}
        fullWidth
      >
        <MLJobEditor
          mode={EDITOR_MODE.JSON}
          readOnly={(initialized === true)}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
}

function IngestPipeline({ initialized, data, onChange }) {
  return (
    <React.Fragment>
      <EuiFormRow
        label="Ingest pipeline"
        disabled={(initialized === true)}
        fullWidth
      >
        <MLJobEditor
          mode={EDITOR_MODE.JSON}
          readOnly={(initialized === true)}
          value={data}
          height={EDITOR_HEIGHT}
          syntaxChecking={false}
          onChange={onChange}
        />
      </EuiFormRow>
    </React.Fragment>
  );
}
