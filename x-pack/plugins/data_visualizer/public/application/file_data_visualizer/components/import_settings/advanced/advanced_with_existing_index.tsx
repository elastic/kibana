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
  const [pipelineIdErrors, setPipelineIdErrors] = useState<string[]>([]);
  // const [existingPipeline, setExistingPipeline] = useState<boolean>(true);

  useEffect(() => {
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
  }, [
    getMapping,
    onIndexChange,
    onMappingsStringChange,
    originalMappingsString,
    selectedIndexOptions,
  ]);

  useEffect(() => {
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
  }, [onPipelineIdChange, onPipelineStringChange, pipelines, selectedPipelineOptions]);

  useEffect(() => {
    setMissingFields(getMissingFields(originalMappingsString, mappingsString));
  }, [originalMappingsString, mappingsString]);

  const addMissingField = useCallback(
    (field: Field) => {
      const mappings = JSON.parse(mappingsString);
      mappings.properties[field.name] = { type: field.type };
      onMappingsStringChange(JSON.stringify(mappings, null, 2));
    },
    [mappingsString, onMappingsStringChange]
  );

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('missingFields:', missingFields);
  }, [missingFields]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('indices:', indices);
    setIndexOptions(indices.map((i) => ({ label: i.name })));
  }, [getMapping, indices]);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('pipelines:', pipelines);
    setPipelineOptions(pipelines.map((i) => ({ label: i.name })));
  }, [getMapping, pipelines]);

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

  useEffect(() => {
    chooseSuggestedPipeline();
  }, [pipelineOptions, index, findPipelineOption, chooseSuggestedPipeline]);

  useEffect(() => {
    onPipelineIdChange(null);
    setSelectedPipelineOptions([]);
    if (createNewPipeline) {
      onPipelineStringChange(originalPipelineString);
      onPipelineIdChange(`${index}-pipeline`);
    } else {
      chooseSuggestedPipeline();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createNewPipeline]);

  useEffect(() => {
    if (pipelineId !== null) {
      const pipelineExists = findPipelineOption(pipelineId) !== null;
      setPipelineIdErrors(pipelineExists ? ['Pipeline already exists'] : []);
    }
  }, [findPipelineOption, pipelineId]);

  // !!!!!!!!  add a check to see if the mappings are too different
  // if so, block the import and show a warning

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
        {/* <EuiFieldText
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
        /> */}
        <EuiComboBox<string>
          singleSelection={{ asPlainText: true }}
          selectedOptions={selectedIndexOptions}
          options={indexOptions}
          onChange={setSelectedIndexOptions}
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      {/* <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
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

      <CombinedFieldsForm
        mappingsString={mappingsString}
        pipelineString={pipelineString}
        onMappingsStringChange={onMappingsStringChange}
        onPipelineStringChange={onPipelineStringChange}
        combinedFields={combinedFields}
        onCombinedFieldsChange={onCombinedFieldsChange}
        results={results}
        isDisabled={initialized === true}
      /> */}
      {selectedIndexOptions.length > 0 ? (
        <>
          <EuiFlexGroup>
            {/* <EuiFlexItem>
          <IndexSettings
            initialized={initialized}
            data={indexSettingsString}
            onChange={onIndexSettingsStringChange}
          />
        </EuiFlexItem> */}

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
            {/* </EuiFlexGroup>

          <EuiFlexGroup> */}
            {/* <EuiFlexItem>
          <IndexSettings
            initialized={initialized}
            data={indexSettingsString}
            onChange={onIndexSettingsStringChange}
          />
        </EuiFlexItem> */}
            {/*
        <EuiFlexItem>
          <Mappings
            initialized={initialized}
            data={mappingsString}
            onChange={onMappingsStringChange}
          />
        </EuiFlexItem> */}

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
                    label="Use existing pipeline"
                    checked={!createNewPipeline}
                    onChange={(e) => onCreateNewPipelineChange(!e.target.checked)}
                  />
                  <EuiSpacer size="s" />
                  {createNewPipeline ? (
                    <>
                      <EuiFormRow
                        label="Pipeline ID"
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

function getMissingFields(originalMappingsString: string, mappingsString: string): Field[] {
  const originalFields = extractFields(originalMappingsString);
  const fields = extractFields(mappingsString);

  return differenceWith(originalFields, fields, (a, b) => a.name === b.name);
}
