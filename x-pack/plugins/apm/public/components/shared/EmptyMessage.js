/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiEmptyPrompt } from '@elastic/eui';

function EmptyMessage({ heading, subheading, hideSubheading }) {
  if (!subheading) {
    subheading = 'Try another time range or reset the search filter.';
  }

  return (
    <EuiEmptyPrompt
      titleSize="s"
      title={<div>{heading || 'No data found.'}</div>}
      body={!hideSubheading && subheading}
    />
  );
}

EmptyMessage.propTypes = {
  heading: PropTypes.string,
  hideSubheading: PropTypes.bool
};

EmptyMessage.defaultProps = {
  hideSubheading: false
};

export default EmptyMessage;
