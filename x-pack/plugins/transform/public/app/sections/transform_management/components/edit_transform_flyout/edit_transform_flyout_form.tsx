/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';

import { EuiForm } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EditTransformFlyoutFormTextInput } from './edit_transform_flyout_form_text_input';
import { UseEditTransformFlyoutReturnType } from './use_edit_transform_flyout';

interface EditTransformFlyoutFormProps {
  editTransformFlyout: UseEditTransformFlyoutReturnType;
}

export const EditTransformFlyoutForm: FC<EditTransformFlyoutFormProps> = ({
  editTransformFlyout: [state, dispatch],
}) => {
  const formFields = state.formFields;

  return (
    <EuiForm>
      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutDescriptionInput"
        errorMessages={formFields.description.errorMessages}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormDescriptionLabel', {
          defaultMessage: 'Description',
        })}
        onChange={(value) => dispatch({ field: 'description', value })}
        value={formFields.description.value}
      />
      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutDocsPerSecondInput"
        errorMessages={formFields.docsPerSecond.errorMessages}
        helpText={i18n.translate(
          'xpack.transform.transformList.editFlyoutFormDocsPerSecondHelptext',
          {
            defaultMessage:
              'To enable throttling, set a limit of documents per second of input documents.',
          }
        )}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormdocsPerSecondLabel', {
          defaultMessage: 'Documents per second',
        })}
        onChange={(value) => dispatch({ field: 'docsPerSecond', value })}
        value={formFields.docsPerSecond.value}
      />
      <EditTransformFlyoutFormTextInput
        dataTestSubj="transformEditFlyoutFrequencyInput"
        errorMessages={formFields.frequency.errorMessages}
        helpText={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyHelptext', {
          defaultMessage:
            'The interval between checks for changes in the source indices when the transform is running continuously. Also determines the retry interval in the event of transient failures while the transform is searching or indexing. The minimum value is 1s and the maximum is 1h.',
        })}
        label={i18n.translate('xpack.transform.transformList.editFlyoutFormFrequencyLabel', {
          defaultMessage: 'Frequency',
        })}
        onChange={(value) => dispatch({ field: 'frequency', value })}
        placeholder="1m"
        value={formFields.frequency.value}
      />
    </EuiForm>
  );
};
