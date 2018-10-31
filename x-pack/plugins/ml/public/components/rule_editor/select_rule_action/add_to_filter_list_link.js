/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


/*
 * React component for quick addition of a partitioning field value
 * to a filter list used in the scope part of a rule.
 */

import PropTypes from 'prop-types';
import React from 'react';

import {
  EuiLink,
} from '@elastic/eui';

export function AddToFilterListLink({
  fieldValue,
  filterId,
  addItemToFilterList,
}) {

  return (
    <EuiLink
      onClick={() => addItemToFilterList(fieldValue, filterId, true)}
    >
      Add {fieldValue} to {filterId}
    </EuiLink>
  );
}
AddToFilterListLink.propTypes = {
  fieldValue: PropTypes.string.isRequired,
  filterId: PropTypes.string.isRequired,
  addItemToFilterList: PropTypes.func.isRequired,
};
