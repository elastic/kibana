/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import React, { Fragment } from 'react';
import {
  EuiFormRow,
  EuiFieldText,
  EuiSpacer,
  EuiSelect
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export function IndexSettings({
  setIndexType,
  mappingsOptions,
  indexSelectionEnabled
}) {
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
    </Fragment>
  );
}

function onIndexChange(e) {
  const name = e.target.value;
  this.setState({
    index: name,
    indexNameError: isIndexNameValid(name, this.state.indexNames),
  });
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
