/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

const strings = {
  getCloseButtonLabel: () =>
    i18n.translate('xpack.canvas.expressionElementNotSelected.closeButtonLabel', {
      defaultMessage: 'Close',
    }),
  getSelectDescription: () =>
    i18n.translate('xpack.canvas.expressionElementNotSelected.selectDescription', {
      defaultMessage: 'Select an element to show expression input',
    }),
};

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
