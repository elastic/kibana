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

const { Percentage: strings } = ArgumentStrings;

const PercentageArgInput = ({ onValueChange, argValue }) => {
  const handleChange = (ev) => {
    return onValueChange(ev.target.value / 100);
  };

  return (
    <EuiRange
      compressed
      min={0}
      max={100}
      showLabels
      showInput
      value={argValue * 100}
      onChange={handleChange}
    />
  );
};

PercentageArgInput.propTypes = {
  onValueChange: PropTypes.func.isRequired,
  argValue: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]).isRequired,
  argId: PropTypes.string.isRequired,
};

export const percentage = () => ({
  name: 'percentage',
  displayName: strings.getDisplayName(),
  help: strings.getHelp(),
  simpleTemplate: templateFromReactComponent(PercentageArgInput),
});
