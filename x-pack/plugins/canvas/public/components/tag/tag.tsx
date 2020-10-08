/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
import PropTypes from 'prop-types';
import { EuiBadge, EuiHealth } from '@elastic/eui';

interface Props {
  /**
   * name of the tag
   */
  name: string;
  /**
   * color of the tag
   */
  color?: string;
  /**
   * type of tag to display, i.e. EuiHealth or EuiBadge
   */
  type?: 'health' | 'badge';
}

export const Tag: FunctionComponent<Props> = ({
  name,
  color = '#666666',
  type = 'health',
  ...rest
}) => {
  switch (type) {
    case 'health':
      return (
        <EuiHealth color={color} {...rest}>
          {name}
        </EuiHealth>
      );
    case 'badge':
      return (
        <EuiBadge color={color} {...rest}>
          {name}
        </EuiBadge>
      );
  }
};

Tag.propTypes = {
  name: PropTypes.string.isRequired,
  color: PropTypes.string,
  type: PropTypes.string,
};
