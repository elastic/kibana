/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';

const { ExpressionElementNotSelected: strings } = ComponentStrings;

export const ElementNotSelected = ({ done }) => (
  <div>
    <div>{strings.getSelectDescription()}</div>
    {done && (
      <EuiButton size="s" onClick={done}>
        {' '}
        {strings.getCloseButtonLabel()}
      </EuiButton>
    )}
  </div>
);

ElementNotSelected.propTypes = {
  done: PropTypes.func,
};
