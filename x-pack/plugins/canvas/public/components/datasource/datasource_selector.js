/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { EuiCard, EuiIcon } from '@elastic/eui';

export const DatasourceSelector = ({ onSelect, datasources, current }) => (
  <div className="canvasDataSource__list">
    {datasources.map((d) => (
      <EuiCard
        key={d.name}
        title={d.displayName}
        titleElement="h5"
        titleSize="xs"
        icon={<EuiIcon type={d.image} size="l" />}
        description={d.help}
        layout="horizontal"
        className="canvasDataSource__card"
        selectable={{
          isSelected: d.name === current ? true : false,
          onClick: () => onSelect(d.name),
        }}
      />
    ))}
  </div>
);

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  datasources: PropTypes.array.isRequired,
  current: PropTypes.string.isRequired,
};
