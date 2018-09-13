import React from 'react';
import PropTypes from 'prop-types';
import { EuiSwitch } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';

const ToggleArgInput = ({ onValueChange, argValue, argId }) => {
  const handleChange = () => onValueChange(!argValue);

  return <EuiSwitch id={argId} checked={argValue} onChange={handleChange} />;
};

ToggleArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.bool.isRequired,
  argId: PropTypes.string.isRequired,
};

export const toggle = () => ({
  name: 'toggle',
  displayName: 'Toggle',
  help: 'A true/false toggle switch',
  simpleTemplate: templateFromReactComponent(ToggleArgInput),
  default: 'false',
});
