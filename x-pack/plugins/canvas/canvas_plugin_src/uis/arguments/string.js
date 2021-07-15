/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { EuiFlexItem, EuiFlexGroup, EuiFieldText, EuiButton } from '@elastic/eui';
import { get } from 'lodash';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { String: strings } = ArgumentStrings;

const StringArgInput = ({ argValue, typeInstance, onValueChange, argId }) => {
  const [value, setValue] = useState(argValue);
  const confirm = get(typeInstance, 'options.confirm');

  useEffect(() => {
    setValue(argValue);
  }, [argValue]);

  return (
    <EuiFlexGroup gutterSize="s">
      <EuiFlexItem>
        <EuiFieldText
          compressed
          id={argId}
          value={value}
          onChange={
            confirm ? (ev) => setValue(ev.target.value) : (ev) => onValueChange(ev.target.value)
          }
        />
      </EuiFlexItem>
      {confirm && (
        <EuiFlexItem grow={false} className="canvasSidebar__panel-noMinWidth">
          <EuiButton size="s" onClick={() => onValueChange(value)}>
            {confirm}
          </EuiButton>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

StringArgInput.propTypes = {
  argId: PropTypes.string.isRequired,
  argValue: PropTypes.any.isRequired,
  onValueChange: PropTypes.func.isRequired,
  typeInstance: PropTypes.object.isRequired,
};

export const string = () => ({
  name: 'string',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(StringArgInput),
});
