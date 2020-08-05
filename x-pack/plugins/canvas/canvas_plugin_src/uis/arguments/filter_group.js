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
import { ArgumentStrings } from '../../../i18n';

const { FilterGroup: strings } = ArgumentStrings;

const FilterGroupInput = ({ onValueChange, argValue, argId, filterGroups }) => {
  const [inputValue, setInputValue] = useState('');
  const [addMode, setAddMode] = useState(false);

  // make sure the argValue is always included in the filter group list
  const argValueChoice = argValue && !filterGroups.includes(argValue) ? [{ text: argValue }] : [];

  const choices = [{ text: 'No group', value: '' }].concat(
    argValueChoice,
    filterGroups.map((f) => ({ text: f }))
  );

  const handleSelectGroup = (ev) => {
    const selected = ev.target.value;
    onValueChange(selected);
  };

  const handleAddGroup = (ev) => {
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
            onChange={(ev) => setInputValue(ev.target.value)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false} className="canvasSidebar__panel-noMinWidth">
          <EuiButton type="submit" size="s" onClick={handleAddGroup}>
            {strings.getButtonSet()}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiButtonEmpty color="danger" size="xs" onClick={() => setAddMode(!addMode)} flush="left">
        {strings.getButtonCancel()}
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
        {strings.getCreateNewGroup()}
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
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(FilterGroupInput),
});
