/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import React, { FC, useState, useEffect } from 'react';
import {
  EuiModal,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalBody,
  EuiModalFooter,
  EuiButtonEmpty,
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { FindFileStructureResponse, InputOverrides } from '../../../../../../file_upload/common';
import { createUrlOverrides } from '../../../common/components/utils/utils';

import { TopValues } from '../../../common/components/top_values/top_values';
import { DocumentStatsTable } from '../../../common/components/stats_table/components/field_data_expanded_row/document_stats';
import { createFields } from '../../../common/components/fields_stats_grid/create_fields';
import type { FieldVisStats } from '../../../../../common/types';
import type { FileBasedFieldVisConfig } from '../../../../../common/types/field_vis_config';

const TEST_FIELD = '___TEST_FIELD___';

interface DeleteModelsModalProps {
  overrides: InputOverrides;
  originalSettings: InputOverrides;
  data: string;
  editFieldCache: any;
  analyzeFile(
    data: string,
    overrides: InputOverrides
  ): Promise<{ results: FindFileStructureResponse }>;
  onClose: (fieldName: string | null) => void;
}

export const EditFieldModal: FC<DeleteModelsModalProps> = ({
  onClose,
  data,
  analyzeFile,
  overrides,
  originalSettings,
  editFieldCache,
}) => {
  const [fieldName, setFieldName] = useState('');
  const [fieldStats, setFieldStats] = useState<FieldVisStats | undefined>();
  const [fieldConfig, setFieldConfig] = useState<FileBasedFieldVisConfig | undefined>();

  useEffect(() => {
    const newOverrides = cloneDeep(overrides);
    const { grokComponents, indexOfSpecialWord } = cloneDeep(editFieldCache);
    grokComponents.reverse();
    grokComponents[indexOfSpecialWord] = `%{DATA:${TEST_FIELD}}`;
    grokComponents.reverse();
    newOverrides.grokPattern = grokComponents.join('');
    const overrides2 = createUrlOverrides(newOverrides, originalSettings);
    analyzeFile(data, overrides2).then((resp) => {
      // eslint-disable-next-line no-console
      console.log(resp);
      const fields = createFields(resp.results);
      const stats = fields.fields.find((f) => f.fieldName === TEST_FIELD)?.stats;
      const config: FileBasedFieldVisConfig = {
        type: 'keyword',
        stats,
      };

      setFieldStats(stats);
      setFieldConfig(config);
    });
  }, [analyzeFile, originalSettings, overrides, data, editFieldCache]);

  return (
    <EuiModal
      onClose={onClose.bind(null, null)}
      initialFocus="[name=textInput]"
      data-test-subj="mlModelsDeleteModal"
    >
      <EuiModalHeader>
        <EuiModalHeaderTitle>Add new field</EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <>
          <EuiFieldText
            value={fieldName}
            onChange={(e) => setFieldName(e.target.value)}
            tabIndex={0}
            name="textInput"
            placeholder="Field name"
          />
        </>
        {fieldConfig !== undefined && fieldStats !== undefined && (
          <>
            <EuiHorizontalRule />
            <EuiFlexGroup gutterSize={'s'}>
              <EuiFlexItem>
                <DocumentStatsTable config={fieldConfig} />
              </EuiFlexItem>
              <EuiFlexItem>
                <TopValues stats={fieldStats} barColor="secondary" />
              </EuiFlexItem>
            </EuiFlexGroup>
          </>
        )}
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButtonEmpty onClick={onClose.bind(null, null)}>
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.cancelButtonLabel"
            defaultMessage="Cancel"
          />
        </EuiButtonEmpty>

        <EuiButton
          disabled={fieldName === ''}
          onClick={onClose.bind(null, fieldName)}
          fill
          color="danger"
          data-test-subj="mlModelsDeleteModalConfirmButton"
        >
          <FormattedMessage
            id="xpack.ml.trainedModels.modelsList.deleteModal.deleteButtonLabel"
            defaultMessage="Save"
          />
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
