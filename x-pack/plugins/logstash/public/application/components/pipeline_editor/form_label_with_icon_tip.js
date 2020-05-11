/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiIconTip } from '@elastic/eui';

export function FormLabelWithIconTip({ formRowLabelText, formRowTooltipText }) {
  return (
    <div>
      <span>{formRowLabelText}</span>
      &nbsp;
      <EuiIconTip content={formRowTooltipText} size="s" type="questionInCircle" />
    </div>
  );
}

FormLabelWithIconTip.propTypes = {
  formRowLabelText: PropTypes.string.isRequired,
  formRowTooltipText: PropTypes.string.isRequired,
};
