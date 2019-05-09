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
  EuiSelect,
  EuiCallOut
} from '@elastic/eui';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';
import { getExistingIndices, getExistingIndexPatterns }
  from '../util/indexing_service';

export const IndexSettings = injectI18n(function IndexSettings({
  disabled,
  indexName,
  setIndexName,
  setSelectedIndexType,
  indexTypes,
  intl,
  setHasIndexErrors
}) {
  const [indexNames, setIndexNames] = useState(null);
  const [indexNameError, setIndexNameError] = useState('');
  const [indexPatterns, setIndexPatterns] = useState(null);

  useEffect(() => {
    setHasIndexErrors(!!indexNameError);
  });

  if (!indexNames) {
    getExistingIndices().then(indices => {
      const indexNames = indices
        ? indices.map(({ name }) => name)
        : [];
      setIndexNames(indexNames);
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
          onChange={({ target }) => setSelectedIndexType(target.value)}
        />
      </EuiFormRow>
      <EuiSpacer size="m" />
      {indexDisabled
        ? null
        : (
          <EuiCallOut
            title="Index name guidelines"
            iconType="pin"
          >
            <div>
              <ul>
                <li>Must be a new index</li>
                <li>Lowercase only</li>
                <li>{`Cannot include \\, /, *, ?, ", <, >, |, \` \` \
                  (space character), , (comma), #`
                }
                </li>
                <li>{`Cannot start with -, _, +`}</li>
                <li>{`Cannot be . or ..`}</li>
                <li>{
                  `Cannot be longer than 255 bytes (note it is bytes, \
                  so multi-byte characters will count towards the 255 \
                  limit faster)`
                }
                </li>
              </ul>
            </div>
          </EuiCallOut>
        )}
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
            defaultMessage: 'Enter Index Name'
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
