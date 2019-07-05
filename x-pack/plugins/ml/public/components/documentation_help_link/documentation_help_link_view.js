/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import PropTypes from 'prop-types';
import React from 'react';
import { EuiIcon } from '@elastic/eui';

export function DocumentationHelpLink({ fullUrl, label }) {
  return (
    <a
      href={fullUrl}
      rel="noopener"
      target="_blank"
      className="documentation-help-link"
    >
      {label} <EuiIcon type="popout" />
    </a>
  );
}
DocumentationHelpLink.propTypes = {
  fullUrl: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired
};
