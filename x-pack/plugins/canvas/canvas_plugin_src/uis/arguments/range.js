/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiRange } from '@elastic/eui';
import { templateFromReactComponent } from '../../../public/lib/template_from_react_component';
import { ArgumentStrings } from '../../../i18n';

const { Range: strings } = ArgumentStrings;

const RangeArgInput = ({ typeInstance, onValueChange, argValue }) => {
  const { min, max, step } = typeInstance.options;
  const handleChange = (ev) => {
    return onValueChange(Number(ev.target.value));
  };

  return (
    <EuiRange
      compressed
      min={min}
      max={max}
      step={step}
      showLabels
      showInput
      value={argValue}
      onChange={handleChange}
    />
  );
};

RangeArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  typeInstance: PropTypes.shape({
    options: PropTypes.shape({
      min: PropTypes.number.isRequired,
      max: PropTypes.number.isRequired,
      step: PropTypes.number,
    }).isRequired,
  }),
  argId: PropTypes.string.isRequired,
};

export const range = () => ({
  name: 'range',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(RangeArgInput),
});
