/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiIconTip } from '@elastic/eui';

export function FormLabelWithIconTip({ labelText, tooltipText }) {
  if (!labelText && !tooltipText) { return null; }

  return (
    <div>
      <span>{labelText}</span>
      &nbsp;
      <EuiIconTip content={tooltipText} type="questionInCircle" />
    </div>
  );
}

FormLabelWithIconTip.propTypes = {
  labelText: PropTypes.string.isRequired,
  tooltipText: PropTypes.string.isRequired,
};
