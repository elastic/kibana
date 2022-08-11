/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';

import { EuiFieldText, EuiFormRow, EuiCheckbox, EuiSpacer } from '@elastic/eui';
import {
  CombinedField,
  CombinedFieldsReadOnlyForm,
} from '../../../common/components/combined_fields';
import { CreateDataViewToolTip } from './create_data_view_tooltip';

interface Props {
  index: string;
  initialized: boolean;
  onIndexChange(): void;
  createDataView: boolean;
  onCreateDataViewChange(): void;
  indexNameError: string;
  combinedFields: CombinedField[];
  canCreateDataView: boolean;
}

export const SimpleSettings: FC<Props> = ({
  index,
  initialized,
  onIndexChange,
  createDataView,
  onCreateDataViewChange,
  indexNameError,
  combinedFields,
  canCreateDataView,
}) => {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.dataVisualizer.file.simpleImportSettings.indexNameFormRowLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.dataVisualizer.file.simpleImportSettings.indexNamePlaceholder',
            {
              defaultMessage: 'index name',
            }
          )}
          value={index}
          disabled={initialized === true}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
          aria-label={i18n.translate(
            'xpack.dataVisualizer.file.simpleImportSettings.indexNameAriaLabel',
            {
              defaultMessage: 'Index name, required field',
            }
          )}
          data-test-subj="dataVisualizerFileIndexNameInput"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <CreateDataViewToolTip showTooltip={canCreateDataView === false}>
        <EuiCheckbox
          id="createDataView"
          label={
            <FormattedMessage
              id="xpack.dataVisualizer.file.simpleImportSettings.createDataViewLabel"
              defaultMessage="Create data view"
            />
          }
          checked={createDataView === true}
          disabled={initialized === true || canCreateDataView === false}
          onChange={onCreateDataViewChange}
          data-test-subj="dataVisualizerFileCreateDataViewCheckbox"
        />
      </CreateDataViewToolTip>

      <EuiSpacer size="m" />

      <CombinedFieldsReadOnlyForm combinedFields={combinedFields} />
    </React.Fragment>
  );
};
