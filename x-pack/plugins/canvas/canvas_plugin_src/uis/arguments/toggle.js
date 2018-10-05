/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { i18n } from '@kbn/i18n';
import { EuiSwitch } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const ToggleArgInput = ({ onValueChange, argValue, argId, renderError }) => {
  const handleChange = () => onValueChange(!argValue);
  if (typeof argValue !== 'boolean') renderError();
  return <EuiSwitch id={argId} checked={argValue} onChange={handleChange} />;
};

ToggleArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.bool, PropTypes.string, PropTypes.object]).isRequired,
  argId: PropTypes.string.isRequired,
  renderError: PropTypes.func.isRequired,
};

export const toggle = () => ({
  name: 'toggle',
  displayName: i18n.translate('xpack.canvas.uis.arguments.toggleDisplayName', {
    defaultMessage: 'Toggle',
  }),
  help: i18n.translate('xpack.canvas.uis.arguments.toggleHelpText', {
    defaultMessage: 'A true/false toggle switch',
  }),
  simpleTemplate: templateFromReactComponent(ToggleArgInput),
  default: 'false',
});
