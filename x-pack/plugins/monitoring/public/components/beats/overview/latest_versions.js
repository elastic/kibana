/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiBasicTable } from '@elastic/eui';

export function LatestVersions({ latestVersions }) {
  return (
    <EuiBasicTable
      items={latestVersions}
      columns={[
        {
          field: 'version',
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

LatestVersions.propTypes = {
  latestVersions: PropTypes.arrayOf(
    PropTypes.shape({
      version: PropTypes.string.isRequired,
      count: PropTypes.number.isRequired,
    })
  ).isRequired,
};
