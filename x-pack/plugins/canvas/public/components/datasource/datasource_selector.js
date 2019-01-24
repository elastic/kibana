/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCard, EuiIcon } from '@elastic/eui';

export const DatasourceSelector = ({ onSelect, datasources }) => (
  <div>
    {datasources.map(d => (
      <EuiCard
        key={d.name}
        title={d.displayName}
        icon={<EuiIcon type={d.image} size="xxl" />}
        onClick={() => onSelect(d.name)}
        description={d.help}
        layout="horizontal"
        className="canvasDataSource__card"
      />
    ))}
  </div>
);

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  datasources: PropTypes.array.isRequired,
};
