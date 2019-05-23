/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';
import PropTypes from 'prop-types';
import {
  EuiSelect,
  EuiFieldText,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const FilterGroupInput = ({ onValueChange, argValue, argId, filterGroups }) => {
  const [inputValue, setInputValue] = useState('');
  const [addMode, setAddMode] = useState(false);

  const choices = [{ text: 'No group', value: '' }].concat(filterGroups.map(f => ({ text: f })));

  const handleSelectGroup = ev => {
    const selected = ev.target.value;
    onValueChange(selected);
  };

  const handleAddGroup = ev => {
    // stop the form from submitting
    ev.preventDefault();
    // set the new value
    onValueChange(inputValue);
    // reset the component and input value
    setAddMode(false);
    setInputValue('');
  };

  const addForm = (
    <form onSubmit={handleAddGroup}>
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>
          <EuiFieldText
            autoFocus
            compressed
            type="text"
            value={inputValue}
            onChange={ev => setInputValue(ev.target.value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton type="submit" size="s" onClick={handleAddGroup}>
            Set
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiButtonEmpty color="danger" size="xs" onClick={() => setAddMode(!addMode)} flush="left">
        Cancel
      </EuiButtonEmpty>
    </form>
  );

  const selectForm = (
    <Fragment>
      <EuiSelect
        compressed
        id={argId}
        value={argValue || ''}
        options={choices}
        onChange={handleSelectGroup}
      />
      <EuiSpacer size="s" />
      <EuiButtonEmpty size="xs" onClick={() => setAddMode(!addMode)} flush="left">
        Create new group
      </EuiButtonEmpty>
    </Fragment>
  );

  return addMode ? addForm : selectForm;
};

FilterGroupInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  typeInstance: PropTypes.shape({
    name: PropTypes.string.isRequired,
  }),
  argId: PropTypes.string.isRequired,
};

export const filterGroup = () => ({
  name: 'filterGroup',
  displayName: 'Filter Group',
  help: 'Create or select a filter group',
  simpleTemplate: templateFromReactComponent(FilterGroupInput),
});
