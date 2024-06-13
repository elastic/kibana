/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import type { FC } from 'react';
import { useState, useEffect, useCallback } from 'react';
import React from 'react';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut } from '@elastic/eui';
import { EuiSwitch } from '@elastic/eui';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  EuiSpacer,
  EuiFormRow,
  EuiFlexGroup,
  EuiFlexItem,
  EuiComboBox,
  EuiFieldText,
} from '@elastic/eui';

import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { differenceWith } from 'lodash';
import { i18n } from '@kbn/i18n';
import type { CombinedField } from '../../../../common/components/combined_fields';

import { IngestPipeline, Mappings } from './inputs';
import { useExistingIndices } from './use_existing_indices';

interface Field {
  name: string;
  type: string;
}

interface Props {
  index: string;
  dataView: string;
  initialized: boolean;
  onIndexChange(index: string, skipValidation?: boolean): void;
  createDataView: boolean;
  onCreateDataViewChange(): void;
  onDataViewChange(): void;
  indexSettingsString: string;
  mappingsString: string;
  pipelineString: string;
  onIndexSettingsStringChange(): void;
  onMappingsStringChange(mappings: string): void;
  onPipelineStringChange(pipeline: string): void;
  pipelineId: string | null;
  onPipelineIdChange(pipelineId: string | null): void;
  indexNameError: string;
  dataViewNameError: string;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  results: FindFileStructureResponse;
  canCreateDataView: boolean;
  originalMappingsString: string;
  originalPipelineString: string;
  createNewPipeline: boolean;
  onCreateNewPipelineChange: (b: boolean) => void;
}

export const AdvancedWithExistingIndexSettings: FC<Props> = ({
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
  pipelineId,
  onPipelineIdChange,
  indexNameError,
  dataViewNameError,
  combinedFields,
  onCombinedFieldsChange,
  results,
  canCreateDataView,
  originalMappingsString,
  originalPipelineString,
  createNewPipeline,
  onCreateNewPipelineChange,
}) => {
  const { indices, pipelines, getMapping } = useExistingIndices();
  const [indexOptions, setIndexOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [selectedIndexOptions, setSelectedIndexOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [pipelineOptions, setPipelineOptions] = useState<Array<EuiComboBoxOptionOption<string>>>(
    []
  );
  const [selectedPipelineOptions, setSelectedPipelineOptions] = useState<
    Array<EuiComboBoxOptionOption<string>>
  >([]);
  const [missingFields, setMissingFields] = useState<Field[]>([]);
  const [incompatibleMappingsWarnings, setIncompatibleMappingsWarning] = useState<string[]>([]);
  const [pipelineIdErrors, setPipelineIdErrors] = useState<string[]>([]);

  useEffect(
    function onIndexSelectionChange() {
      if (selectedIndexOptions.length === 0) {
        onIndexChange('', true);
        return;
      }
      onIndexChange(selectedIndexOptions[0].label, true);
      getMapping(selectedIndexOptions[0].label).then((m) => {
        // eslint-disable-next-line no-console
        console.log(m);
        const mappingsString2 = JSON.stringify(m, null, 2);
        onMappingsStringChange(mappingsString2);

        const fields = extractFields(mappingsString2);
        // eslint-disable-next-line no-console
        console.log('fields:', fields);
      });
    },
    [
      getMapping,
      onIndexChange,
      onMappingsStringChange,
      originalMappingsString,
      selectedIndexOptions,
    ]
  );

  useEffect(
    function onPipelineSelectionChange() {
      if (selectedPipelineOptions.length === 0) {
        return;
      }
      const pipeline = pipelines.find((p) => p.name === selectedPipelineOptions[0].label);
      if (pipeline !== undefined) {
        onPipelineStringChange(JSON.stringify(pipeline, null, 2));
        // eslint-disable-next-line no-console
        console.log('pipeline:', pipeline);
        onPipelineIdChange(pipeline.name);
      }
    },
    [onPipelineIdChange, onPipelineStringChange, pipelines, selectedPipelineOptions]
  );

  const addMissingField = useCallback(
    (field: Field) => {
      const mappings = JSON.parse(mappingsString);
      mappings.properties[field.name] = { type: field.type };
      onMappingsStringChange(JSON.stringify(mappings, null, 2));
    },
    [mappingsString, onMappingsStringChange]
  );

  useEffect(
    function initMissingFields() {
      const result = getMissingFields(originalMappingsString, mappingsString);
      setMissingFields(result.missingFields);
      setIncompatibleMappingsWarning(result.incompatibleMappings ?? []);
    },
    [originalMappingsString, mappingsString]
  );

  useEffect(
    function initIndicesOptions() {
      setIndexOptions(indices.map((i) => ({ label: i.name })));
    },
    [getMapping, indices]
  );

  useEffect(
    function initPipelineOptions() {
      setPipelineOptions(pipelines.map((i) => ({ label: i.name })));
    },
    [getMapping, pipelines]
  );

  const findPipelineOption = useCallback(
    (id: string) => {
      const suggestedPipeline = pipelineOptions.find((p) => p.label === id);
      if (suggestedPipeline !== undefined) {
        return suggestedPipeline;
      }
      return null;
    },
    [pipelineOptions]
  );

  const chooseSuggestedPipeline = useCallback(() => {
    if (index !== '') {
      const suggestedPipeline = findPipelineOption(`${index}-pipeline`);
      if (suggestedPipeline) {
        setSelectedPipelineOptions([suggestedPipeline]);
      }
    }
  }, [index, findPipelineOption]);

  useEffect(
    function autoSelectSuggestedPipeline() {
      chooseSuggestedPipeline();
    },
    [pipelineOptions, index, findPipelineOption, chooseSuggestedPipeline]
  );

  useEffect(
    function toggleCreateNewPipeline() {
      onPipelineIdChange(null);
      setSelectedPipelineOptions([]);
      if (createNewPipeline) {
        onPipelineStringChange(originalPipelineString);
        onPipelineIdChange(`${index}-pipeline`);
      } else {
        chooseSuggestedPipeline();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [createNewPipeline]
  );

  useEffect(
    function validatePipelineId() {
      if (pipelineId !== null) {
        const pipelineExists = findPipelineOption(pipelineId) !== null;
        setPipelineIdErrors(pipelineExists ? ['Pipeline already exists'] : []);
      }
    },
    [findPipelineOption, pipelineId]
  );

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
        <EuiComboBox<string>
          singleSelection={{ asPlainText: true }}
          selectedOptions={selectedIndexOptions}
          options={indexOptions}
          onChange={setSelectedIndexOptions}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {selectedIndexOptions.length > 0 ? (
        <>
          <EuiFlexGroup>
            <EuiFlexItem>
              <Mappings
                initialized={initialized}
                data={mappingsString}
                onChange={onMappingsStringChange}
                indexName={selectedIndexOptions[0].label}
              />

              {missingFields.length > 0 ? (
                <>
                  <EuiSpacer />

                  <EuiFormRow
                    label={
                      <FormattedMessage
                        id="xpack.dataVisualizer.file.advancedImportSettings.ingestPipelineLabel"
                        defaultMessage="Fields missing in mappings"
                      />
                    }
                    fullWidth
                  >
                    <>
                      <EuiSpacer size="s" />
                      {missingFields.map((f) => (
                        <EuiFlexGroup key={f.name}>
                          <EuiFlexItem>
                            {f.name} ({f.type})
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty color={'primary'} onClick={() => addMissingField(f)}>
                              Add field
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      ))}
                    </>
                  </EuiFormRow>
                </>
              ) : null}
            </EuiFlexItem>

            <EuiFlexItem>
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.dataVisualizer.file.advancedImportSettings.ingestPipelineLabel"
                    defaultMessage="Ingest pipeline"
                  />
                }
                fullWidth
              >
                <>
                  <EuiSwitch
                    compressed
                    label={i18n.translate(
                      'xpack.dataVisualizer.file.advancedImportSettingsIndex.useExistingPipeline',
                      {
                        defaultMessage: 'Use existing pipeline',
                      }
                    )}
                    checked={!createNewPipeline}
                    onChange={(e) => onCreateNewPipelineChange(!e.target.checked)}
                  />
                  <EuiSpacer size="s" />
                  {createNewPipeline ? (
                    <>
                      <EuiFormRow
                        label={i18n.translate(
                          'xpack.dataVisualizer.file.advancedImportSettingsIndex.pipelineId',
                          {
                            defaultMessage: 'Pipeline ID',
                          }
                        )}
                        isInvalid={pipelineIdErrors.length > 0}
                        error={pipelineIdErrors}
                      >
                        <EuiFieldText
                          value={pipelineId ?? ''}
                          onChange={(e) => onPipelineIdChange(e.target.value)}
                        />
                      </EuiFormRow>

                      <IngestPipeline
                        initialized={initialized}
                        data={pipelineString}
                        onChange={onPipelineStringChange}
                      />
                    </>
                  ) : (
                    <EuiComboBox<string>
                      singleSelection={{ asPlainText: true }}
                      selectedOptions={selectedPipelineOptions}
                      options={pipelineOptions}
                      onChange={setSelectedPipelineOptions}
                    />
                  )}
                </>
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
          <MappingsWarning warnings={incompatibleMappingsWarnings} />
        </>
      ) : null}
    </>
  );
};

function extractFields(mappingsString: string): Field[] {
  const mappings: estypes.IndicesGetFieldMappingTypeFieldMappings['mappings'] =
    JSON.parse(mappingsString);
  return Object.entries(mappings.properties).map(([name, { type }]) => ({ name, type }));
}

const mappingsWarnings = {
  tooManyNewFields: i18n.translate(
    'xpack.dataVisualizer.file.advancedImportSettingsIndex.tooManyNewFields',
    {
      defaultMessage: 'More than half of the fields in the file are new to this index',
    }
  ),
  someTypesAreDifferent: i18n.translate(
    'xpack.dataVisualizer.file.advancedImportSettingsIndex.someTypesAreDifferent',
    {
      defaultMessage: 'Some field types are different',
    }
  ),
};

function getMissingFields(
  originalMappingsString: string,
  mappingsString: string
): {
  missingFields: Field[];
  incompatibleMappings: string[];
} {
  const originalFields = extractFields(originalMappingsString);
  const fields = extractFields(mappingsString);
  const missingFields = differenceWith(originalFields, fields, (a, b) => a.name === b.name);

  let newFields = 0;
  const incompatibleMappings = [];

  for (const f of fields) {
    const originalField = originalFields.find((of) => of.name === f.name);
    if (originalField === undefined) {
      newFields++;
    } else if (originalField !== undefined && originalField.type !== f.type) {
      incompatibleMappings.push(mappingsWarnings.someTypesAreDifferent);
      break;
    }
  }

  if (newFields >= fields.length / 2) {
    incompatibleMappings.push(mappingsWarnings.tooManyNewFields);
  }

  return {
    missingFields,
    incompatibleMappings,
  };
}

const MappingsWarning: FC<{ warnings: string[] }> = ({ warnings }) => {
  return (
    <EuiCallOut
      title={
        <FormattedMessage
          id="xpack.dataVisualizer.file.advancedImportSettingsIndex.mappingWarningTitle"
          defaultMessage="Possibly incompatible mappings"
        />
      }
      color="warning"
      iconType="warning"
    >
      {warnings.map((warning, i) => (
        <React.Fragment key={warning}>
          {warning}
          {i < warnings.length - 1 ? <EuiSpacer size="s" /> : null}
        </React.Fragment>
      ))}
    </EuiCallOut>
  );
};
