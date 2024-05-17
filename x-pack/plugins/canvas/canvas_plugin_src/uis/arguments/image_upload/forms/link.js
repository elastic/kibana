/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import PropTypes from 'prop-types';
import React from 'react';
import { ArgumentStrings } from '../../../../../i18n';

const { ImageUpload: strings } = ArgumentStrings;

export const LinkForm = ({ url, inputRef, onSubmit }) => (
  <EuiFormRow display="rowCompressed" onSubmit={onSubmit} className="eui-textRight">
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <EuiFieldText
          compressed={true}
          defaultValue={url}
          inputRef={inputRef}
          placeholder={strings.getUrlFieldPlaceholder()}
          aria-label={strings.getUrlFieldPlaceholder()}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton type="submit" size="s" onClick={onSubmit}>
          Set
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiFormRow>
);

LinkForm.propTypes = {
  url: PropTypes.string,
  inputRef: PropTypes.func,
  onSubmit: PropTypes.func,
};
