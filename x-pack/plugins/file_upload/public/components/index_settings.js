/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, useState } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSelect
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

export const IndexSettings = injectI18n(function IndexSettings({
  index,
  setIndex,
  setIndexType,
  mappingsOptions,
  indexSelectionEnabled,
  intl
}) {
  const [indexError, setIndexError] = useState('');

  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.advancedImportSettings.indexNameLabel"
            defaultMessage="Index type"
          />
        }
      >
        { indexSelectionEnabled
          ? (
            <EuiSelect
              options={mappingsOptions}
              enabled={indexSelectionEnabled}
              onChange={setIndexType}
            />
          )
          : (
            <EuiSelect
              disabled
            />
          )
        }
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.file_upload.indexNameLabel"
            defaultMessage="Index name"
          />
        }
        // isInvalid={indexNameError !== ''}
        // error={[indexNameError]}
      >
        <EuiFieldText
          placeholder={intl.formatMessage({
            id: 'xpack.file_upload.indexNamePlaceholder',
            defaultMessage: 'index name'
          })}
          value={index}
          // disabled={(initialized === true)}
          onChange={onIndexChange(setIndex, setIndexError)}
          isInvalid={indexError !== ''}
          aria-label={intl.formatMessage({
            id: 'xpack.file_upload.indexNameAriaLabel',
            defaultMessage: 'Index name, required field'
          })}
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.file_upload.indexPatternNameLabel"
            defaultMessage="Index pattern name"
          />
        }
        // disabled={(createIndexPattern === false || initialized === true)}
        // isInvalid={indexPatternNameError !== ''}
        // error={[indexPatternNameError]}
      >
        <EuiFieldText
          // disabled={(createIndexPattern === false || initialized === true)}
          // placeholder={(createIndexPattern === true) ? index : ''}
          // value={indexPattern}
          // onChange={onIndexPatternChange}
          // isInvalid={indexPatternNameError !== ''}
        />
      </EuiFormRow>

    </Fragment>
  );
});

function onIndexChange(setIndex, setIndexError) {
  return ({ target }) => {
    const name = target.value;
    setIndex(name);
    // setIndexError(isIndexNameValid);
  };
}

function isIndexNameValid(name, indexNames) {
  if (indexNames.find(i => i === name)) {
    return (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importView.indexNameAlreadyExistsErrorMessage"
        defaultMessage="Index name already exists"
      />
    );
  }

  const reg = new RegExp('[\\\\/\*\?\"\<\>\|\\s\,\#]+');
  if (
    (name !== name.toLowerCase()) || // name should be lowercase
    (name === '.' || name === '..')   || // name can't be . or ..
    name.match(/^[-_+]/) !== null  || // name can't start with these chars
    name.match(reg) !== null // name can't contain these chars
  ) {
    return (
      <FormattedMessage
        id="xpack.ml.fileDatavisualizer.importView.indexNameContainsIllegalCharactersErrorMessage"
        defaultMessage="Index name contains illegal characters"
      />
    );
  }
  return '';
}
