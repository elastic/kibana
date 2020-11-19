/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { FC } from 'react';

import { EuiFieldText, EuiFormRow, EuiCheckbox, EuiSpacer } from '@elastic/eui';
import { CombinedField, CombinedFieldsReadOnlyForm } from '../combined_fields';

interface Props {
  index: string;
  initialized: boolean;
  onIndexChange(): void;
  createIndexPattern: boolean;
  onCreateIndexPatternChange(): void;
  indexNameError: string;
  combinedFields: CombinedField[];
}

export const SimpleSettings: FC<Props> = ({
  index,
  initialized,
  onIndexChange,
  createIndexPattern,
  onCreateIndexPatternChange,
  indexNameError,
  combinedFields,
}) => {
  return (
    <React.Fragment>
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.simpleImportSettings.indexNameFormRowLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={i18n.translate(
            'xpack.ml.fileDatavisualizer.simpleImportSettings.indexNamePlaceholder',
            {
              defaultMessage: 'index name',
            }
          )}
          value={index}
          disabled={initialized === true}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
          aria-label={i18n.translate(
            'xpack.ml.fileDatavisualizer.simpleImportSettings.indexNameAriaLabel',
            {
              defaultMessage: 'Index name, required field',
            }
          )}
          data-test-subj="mlFileDataVisIndexNameInput"
        />
      </EuiFormRow>

      <EuiSpacer size="m" />

      <EuiCheckbox
        id="createIndexPattern"
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.simpleImportSettings.createIndexPatternLabel"
            defaultMessage="Create index pattern"
          />
        }
        checked={createIndexPattern === true}
        disabled={initialized === true}
        onChange={onCreateIndexPatternChange}
        data-test-subj="mlFileDataVisCreateIndexPatternCheckbox"
      />

      <EuiSpacer size="m" />

      <CombinedFieldsReadOnlyForm combinedFields={combinedFields} />
    </React.Fragment>
  );
};
