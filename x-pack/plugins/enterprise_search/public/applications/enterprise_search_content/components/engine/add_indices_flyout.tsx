/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { Status } from '../../../../../common/types/api';
import { isNotNullish } from '../../../../../common/utils/is_not_nullish';
import { getErrorsFromHttpResponse } from '../../../shared/flash_messages/handle_api_errors';

import {
  IndicesSelectComboBox,
  IndicesSelectComboBoxOption,
  indexToOption,
} from '../engines/components/indices_select_combobox';

import { AddIndicesLogic } from './add_indices_logic';

export interface AddIndicesFlyoutProps {
  onClose: () => void;
}

export const AddIndicesFlyout: React.FC<AddIndicesFlyoutProps> = ({ onClose }) => {
  const { selectedIndices, updateEngineStatus, updateEngineError } = useValues(AddIndicesLogic);
  const { setSelectedIndices, submitSelectedIndices } = useActions(AddIndicesLogic);

  const selectedOptions = useMemo(() => selectedIndices.map(indexToOption), [selectedIndices]);
  const onIndicesChange = useCallback(
    (options: IndicesSelectComboBoxOption[]) => {
      setSelectedIndices(options.map(({ value }) => value).filter(isNotNullish));
    },
    [setSelectedIndices]
  );

  return (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle>
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.title',
              { defaultMessage: 'Add new indices' }
            )}
          </h2>
        </EuiTitle>
        {updateEngineStatus === Status.ERROR && updateEngineError && (
          <>
            <EuiSpacer />
            <EuiCallOut
              color="danger"
              title={i18n.translate(
                'xpack.enterpriseSearch.content.engines.indices.addIndicesFlyout.updateError.title',
                { defaultMessage: 'Error updating engine' }
              )}
            >
              {getErrorsFromHttpResponse(updateEngineError).map((errMessage, i) => (
                <p id={`createErrorMsg.${i}`}>{errMessage}</p>
              ))}
            </EuiCallOut>
          </>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          fullWidth
          label={i18n.translate(
            'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.selectableLabel',
            { defaultMessage: 'Select searchable indices' }
          )}
        >
          <IndicesSelectComboBox
            fullWidth
            onChange={onIndicesChange}
            selectedOptions={selectedOptions}
          />
        </EuiFormRow>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" direction="rowReverse">
          <EuiFlexItem grow={false}>
            <EuiButton fill iconType="plusInCircle" onClick={submitSelectedIndices}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.submitButton',
                { defaultMessage: 'Add selected' }
              )}
            </EuiButton>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty flush="left" onClick={onClose}>
              {i18n.translate(
                'xpack.enterpriseSearch.content.engine.indices.addIndicesFlyout.cancelButton',
                { defaultMessage: 'Cancel' }
              )}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
