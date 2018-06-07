/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { isReservedSpace } from '../../../../common';
import {
  EuiBadge,
  EuiToolTip,
  EuiFlexItem,
} from '@elastic/eui';


export const ReservedSpaceBadge = (props) => {
  const {
    space
  } = props;

  if (isReservedSpace(space)) {
    return (
      <EuiFlexItem grow={false}>
        <EuiToolTip content={'Reserved spaces are built-in and can only be partially changed.'}>
          <EuiBadge iconType={'lock'}>Reserved Space</EuiBadge>
        </EuiToolTip>
      </EuiFlexItem>
    );
  }
  return null;
};

ReservedSpaceBadge.propTypes = {
  space: PropTypes.object.isRequired
};
