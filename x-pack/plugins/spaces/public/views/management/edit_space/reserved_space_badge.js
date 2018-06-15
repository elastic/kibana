/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';

import { isReservedSpace } from '../../../../common';
import {
  EuiIcon,
  EuiToolTip,
} from '@elastic/eui';


export const ReservedSpaceBadge = (props) => {
  const {
    space
  } = props;

  if (isReservedSpace(space)) {
    return (
      <EuiToolTip content={'Reserved spaces are built-in and can only be partially modified.'}>
        <EuiIcon style={{ verticalAlign: "super" }} type={'lock'} />
      </EuiToolTip>
    );
  }
  return null;
};

ReservedSpaceBadge.propTypes = {
  space: PropTypes.object.isRequired
};
