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
import { getExistingIndices } from '../util/indexing_service';

export const IndexSettings = injectI18n(function IndexSettings({
  disabled,
  indexName,
  setIndexName,
  setIndexDataType,
  mappingsOptions,
  intl
}) {
  const [indexNameError, setIndexNameError] = useState('');
  const [indexNames, setIndexNames] = useState(null);

  if (!indexNames) {
    getExistingIndices().then(indices => {
      setIndexNames(indices
        ? indices.map(({ name }) => name)
        : []);
    });
  }

  return (
    <Fragment>
      <EuiSpacer size="m" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.file_upload.indexNameLabel"
            defaultMessage="Index type"
          />
        }
      >
        <EuiSelect
          disabled={disabled}
          options={mappingsOptions}
          onChange={({ target }) => {
            setIndexDataType(target.value);
          }}
        />
      </EuiFormRow>
      <EuiSpacer size="s" />
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.file_upload.indexNameLabel"
            defaultMessage="Index name"
          />
        }
        isInvalid={indexNameError !== ''}
        error={[indexNameError]}
      >
        <EuiFieldText
          disabled={disabled}
          placeholder={intl.formatMessage({
            id: 'xpack.file_upload.indexNamePlaceholder',
            defaultMessage: 'index name'
          })}
          value={indexName}
          onChange={onIndexChange(setIndexName, setIndexNameError, indexNames)}
          isInvalid={indexNameError !== ''}
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
        // isInvalid={indexPatternNameError !== ''}
        // error={[indexPatternNameError]}
      >
        <EuiFieldText
          disabled={disabled}
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

function onIndexChange(setIndex, setIndexNameError, indexNames) {
  return ({ target }) => {
    const name = target.value;
    const errorMessage = isIndexNameValid(name, indexNames);
    setIndexNameError(errorMessage);
    setIndex(name);
  };
}

function isIndexNameValid(name, indexNames) {
  if (indexNames.find(i => i === name)) {
    return (
      <FormattedMessage
        id="xpack.file_upload.indexNameAlreadyExistsErrorMessage"
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
        id="xpack.file_upload.indexNameContainsIllegalCharactersErrorMessage"
        defaultMessage="Index name contains illegal characters"
      />
    );
  }
  return '';
}
