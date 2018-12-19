/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiForm, EuiFlexGroup, EuiFlexItem, EuiFieldText, EuiButton } from '@elastic/eui';

export const LinkForm = ({ url, inputRef, onSubmit }) => (
  <EuiForm onSubmit={onSubmit} className="eui-textRight">
    <EuiFlexGroup gutterSize="xs">
      <EuiFlexItem>
        <EuiFieldText
          compressed
          defaultValue={url}
          inputRef={inputRef}
          placeholder="Image URL"
          aria-label="Image URL"
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiButton type="submit" size="s" onClick={onSubmit}>
          Set
        </EuiButton>
      </EuiFlexItem>
    </EuiFlexGroup>
  </EuiForm>
);

LinkForm.propTypes = {
  url: PropTypes.string,
  inputRef: PropTypes.func,
  onSubmit: PropTypes.func,
};
