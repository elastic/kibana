/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment, useState, useEffect } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSelect
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getExistingIndices, getExistingIndexPatterns }
  from '../util/indexing_service';

export const IndexSettings = injectI18n(function IndexSettings({
  disabled,
  indexName,
  setIndexName,
  indexPattern,
  setIndexPattern,
  setIndexDataType,
  indexTypes,
  intl,
  setHasIndexErrors
}) {
  const [indexNames, setIndexNames] = useState(null);
  const [indexNameError, setIndexNameError] = useState('');
  const [indexPatterns, setIndexPatterns] = useState(null);
  const [indexPatternError, setIndexPatternError] = useState('');

  useEffect(() => {
    setHasIndexErrors(!!indexPatternError || !!indexNameError);
  });

  if (!indexNames) {
    getExistingIndices().then(indices => {
      const indexNames = indices
        ? indices.map(({ name }) => name)
        : [];
      setIndexNames(indexNames);
      indexNames.length && setIndexDataType(indexNames[0]);
    });
  }

  if (!indexPatterns) {
    getExistingIndexPatterns().then(
      indexPatterns => setIndexPatterns(indexPatterns)
    );
  }

  const indexDisabled = disabled || !indexTypes || !indexTypes.length;

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
          disabled={indexDisabled}
          options={indexTypes.map(indexType =>({
            text: indexType,
            value: indexType,
          }))}
          onChange={({ target }) => setIndexDataType(target.value)}
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
          disabled={indexDisabled}
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
            id="xpack.file_upload.indexPatternLabel"
            defaultMessage="Index pattern"
          />
        }
        isInvalid={indexPatternError !== ''}
        error={[indexPatternError]}
      >
        <EuiFieldText
          disabled={indexDisabled || !indexName}
          placeholder={indexName}
          value={indexPattern}
          onChange={onIndexPatternChange(
            setIndexPattern, setIndexPatternError, indexPatterns, indexName
          )}
          isInvalid={indexPatternError !== ''}
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

function onIndexPatternChange(
  setIndexPattern, setIndexPatternError, indexPatterns, indexName
) {
  return ({ target }) => {
    const pattern = target.value;
    const errorMessage = isIndexPatternValid(pattern, indexPatterns, indexName);
    setIndexPatternError(errorMessage);
    setIndexPattern(pattern);
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

function isIndexPatternValid(name, indexPatterns, index) {
  // if a blank name is entered, the index name will be used so avoid validation
  if (name === '') {
    return '';
  }

  if (indexPatterns.find(i => i === name)) {
    return (
      <FormattedMessage
        id="xpack.file_upload.indexPatternNameAlreadyExistsErrorMessage"
        defaultMessage="Index pattern name already exists"
      />
    );
  }

  // escape . and + to stop the regex matching more than it should.
  let newName = name.replace(/\./g, '\\.');
  newName = newName.replace(/\+/g, '\\+');
  // replace * with .* to make the wildcard match work.
  newName = newName.replace(/\*/g, '.*');
  const reg = new RegExp(`^${newName}$`);
  if (index.match(reg) === null) { // name should match index
    return (
      <FormattedMessage
        id="xpack.file_upload.importView.indexPatternDoesNotMatchIndexNameErrorMessage"
        defaultMessage="Index pattern does not match index name"
      />
    );
  }

  return '';
}
