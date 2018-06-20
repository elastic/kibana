/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import {
  EuiAvatar
} from '@elastic/eui';
import { MAX_SPACE_INITIALS, getSpaceInitials, getSpaceColor } from '../../../common';

export const SpaceAvatar = ({ space, size, ...rest }) => {
  return (
    <EuiAvatar
      type="space"
      name={space.name || ''}
      size={size || "m"}
      initialsLength={MAX_SPACE_INITIALS}
      initials={getSpaceInitials(space)}
      color={getSpaceColor(space)}
      {...rest}
    />
  );
};

SpaceAvatar.propTypes = {
  space: PropTypes.object.isRequired,
  size: PropTypes.string,
};
