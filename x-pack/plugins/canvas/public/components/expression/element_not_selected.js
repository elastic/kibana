/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

export const ElementNotSelected = ({ done }) => (
  <div>
    <FormattedMessage
      id="xpack.canvas.expression.elementNotSelected.descriptionTitle"
      defaultMessage="Select an element to show expression input"
    />
    {done && (
      <EuiButton size="s" onClick={done}>
        {' '}
        <FormattedMessage
          id="xpack.canvas.expression.elementNotSelected.closeButtonLabel"
          defaultMessage="Close"
        />
      </EuiButton>
    )}
  </div>
);

ElementNotSelected.propTypes = {
  done: PropTypes.func,
};
