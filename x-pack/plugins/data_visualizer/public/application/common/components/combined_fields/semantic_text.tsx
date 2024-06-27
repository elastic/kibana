/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import type { FC } from 'react';
import type { FindFileStructureResponse } from '@kbn/file-upload-plugin/common/types';
import type { EuiSelectOption } from '@elastic/eui';
import {
  EuiButton,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTextAlign,
  EuiFieldText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { error } from 'jquery';
import { FormattedMessage } from '@kbn/i18n-react';
// import type { CombinedField } from './types';
import { cloneDeep } from 'lodash';
import { getFieldNames } from './utils';
import { useDataVisualizerKibana } from '../../../kibana_context';

interface Props {
  addCombinedField: (
    addToMappings: (mappings: any) => any,
    addToPipeline: (pipeline: any) => any
  ) => void;
  hasNameCollision: (name: string) => boolean;
  results: FindFileStructureResponse;
}
export const SemanticTextForm: FC<Props> = ({ addCombinedField, hasNameCollision, results }) => {
  const {
    services: { http },
  } = useDataVisualizerKibana();
  const [inferenceServices, setInferenceServices] = useState<EuiSelectOption[]>([]);
  const [selectedInference, setSelectedInference] = useState<string | undefined>();
  const [selectedFieldOption, setSelectedFieldOption] = useState<string | undefined>();
  const [renameToFieldOption, setRenameToFieldOption] = useState<string | null>();

  const fieldOptions = useMemo(
    () =>
      getFieldNames(results).map((columnName: string) => {
        return { value: columnName, text: columnName };
      }),
    [results]
  );

  useEffect(() => {
    setSelectedFieldOption(fieldOptions[0].value);
  }, [fieldOptions]);

  useEffect(() => {
    http
      .fetch<any>('/internal/data_visualizer/inference_services', {
        method: 'GET',
        version: '1',
      })
      .then((response) => {
        setInferenceServices(
          response.map((service: any) => ({ value: service.model_id, text: service.model_id }))
        );
      });
  }, [http]);

  useEffect(() => {
    if (inferenceServices.length === 0) return;
    // @ts-expect-error odd type issue
    setSelectedInference(inferenceServices[0].value);
  }, [inferenceServices]);

  useEffect(() => {
    if (selectedFieldOption?.includes('.')) {
      setRenameToFieldOption(selectedFieldOption.split('.').pop());
    } else {
      setRenameToFieldOption(null);
    }
  }, [selectedFieldOption]);

  const onSubmit = () => {
    if (selectedFieldOption === undefined || selectedInference === undefined) {
      return;
    }
    addCombinedField(
      (mappings: any) => {
        const newMappings = cloneDeep(mappings);
        newMappings.properties[renameToFieldOption ?? selectedFieldOption] = {
          type: 'semantic_text',
          inference_id: selectedInference,
        };
        return newMappings;
      },
      (pipeline: any) => {
        const newPipeline = cloneDeep(pipeline);
        if (renameToFieldOption !== null) {
          newPipeline.processors.push({
            set: {
              field: renameToFieldOption,
              copy_from: selectedFieldOption,
            },
          });
        }
        return newPipeline;
      }
    );
  };

  return (
    <>
      <EuiSpacer size="s" />

      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.file.semanticTextForm.fieldLabel', {
          defaultMessage: 'Field',
        })}
      >
        <EuiSelect
          options={fieldOptions}
          value={selectedFieldOption}
          onChange={(e) => setSelectedFieldOption(e.target.value)}
        />
      </EuiFormRow>

      {renameToFieldOption !== null ? (
        <EuiFormRow
          label={i18n.translate('xpack.dataVisualizer.file.semanticTextForm.copyFieldLabel', {
            defaultMessage: 'Copy to field',
          })}
        >
          <EuiFieldText
            placeholder="Placeholder text"
            value={renameToFieldOption}
            onChange={(e) => setRenameToFieldOption(e.target.value)}
            aria-label="Use aria labels when no actual label is in use"
          />
        </EuiFormRow>
      ) : null}

      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.file.semanticTextForm.inferenceLabel', {
          defaultMessage: 'Inference service',
        })}
      >
        <EuiSelect
          options={inferenceServices}
          value={selectedInference}
          onChange={(e) => setSelectedInference(e.target.value)}
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      {error}

      <EuiTextAlign textAlign="right">
        <EuiButton size="s" fill disabled={false} onClick={onSubmit}>
          <FormattedMessage
            id="xpack.dataVisualizer.file.geoPointForm.submitButtonLabel"
            defaultMessage="Add"
          />
        </EuiButton>
      </EuiTextAlign>
    </>
  );
};
