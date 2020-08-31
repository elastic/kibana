/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiBasicTable } from '@elastic/eui';

export function LatestTypes({ latestTypes }) {
  return (
    <EuiBasicTable
      items={latestTypes}
      columns={[
        {
          field: 'type',
          name: '',
        },
        {
          field: 'count',
          dataType: 'number',
          name: '',
        },
      ]}
    />
  );
}

LatestTypes.propTypes = {
  latestTypes: PropTypes.arrayOf(
    PropTypes.shape({
      type: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
};
