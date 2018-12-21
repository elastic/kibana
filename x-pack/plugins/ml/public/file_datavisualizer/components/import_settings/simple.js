/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { injectI18n, FormattedMessage } from '@kbn/i18n/react';
import React from 'react';

import {
  EuiFieldText,
  EuiFormRow,
  EuiCheckbox,
} from '@elastic/eui';

export const SimpleSettings = injectI18n(function ({
  index,
  initialized,
  onIndexChange,
  createIndexPattern,
  onCreateIndexPatternChange,
  indexNameError,
  intl,
}) {
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
          placeholder={intl.formatMessage({
            id: 'xpack.ml.fileDatavisualizer.simpleImportSettings.indexNamePlaceholder',
            defaultMessage: 'index name'
          })}
          value={index}
          disabled={(initialized === true)}
          onChange={onIndexChange}
          isInvalid={indexNameError !== ''}
        />
      </EuiFormRow>

      <EuiCheckbox
        id="createIndexPattern"
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.simpleImportSettings.createIndexPatternLabel"
            defaultMessage="Create index pattern"
          />
        }
        checked={(createIndexPattern === true)}
        disabled={(initialized === true)}
        onChange={onCreateIndexPatternChange}
      />
    </React.Fragment>
  );
});
