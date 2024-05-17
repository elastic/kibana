/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFormRow, EuiSwitch } from '@elastic/eui';
import PropTypes from 'prop-types';
import React from 'react';
import { ArgumentStrings } from '../../../i18n';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const { Toggle: strings } = ArgumentStrings;

const ToggleArgInput = ({ onValueChange, argValue, argId, renderError, typeInstance }) => {
  const handleChange = () => onValueChange(!argValue);
  if (typeof argValue !== 'boolean') {
    renderError();
    return null;
  }
  return (
    <div>
      <EuiFormRow display="rowCompressed">
        <EuiSwitch
          compressed={true}
          id={argId}
          checked={argValue}
          onChange={handleChange}
          className="canvasArg__form"
          aria-label={typeInstance.displayName}
          resize="none"
          label={typeInstance.options.labelValue}
          showLabel={true}
        />
      </EuiFormRow>
    </div>
  );
};

ToggleArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.string, PropTypes.object]).isRequired,
  argId: PropTypes.string.isRequired,
  typeInstance: PropTypes.shape({
    displayName: PropTypes.string.isRequired,
    options: PropTypes.shape({
      labelValue: PropTypes.string.isRequired,
    }),
  }).isRequired,
  renderError: PropTypes.func.isRequired,
};

export const toggle = () => ({
  name: 'toggle',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  template: templateFromReactComponent(ToggleArgInput),
  default: 'false',
});
