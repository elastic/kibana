/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/css';
import PropTypes from 'prop-types';
import { EuiCard, EuiIcon } from '@elastic/eui';

export const DatasourceSelector = ({ onSelect, datasources, current }) => {
  // TODO: custom css shouldn't be necessary after https://github.com/elastic/eui/issues/6345
  // tested this placeholder fix on mac in Chrome, Firefox, Safari, and Edge
  // with multiple zoom levels and with keyboard <tab> navigation
  // and in a responsive design / mobile view
  const cardStyles = css`
    padding-bottom: 60px;
    position: relative;

    button {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 0;
    }
  `;

  return (
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
          className={`canvasDataSource__card ${cardStyles}`}
          selectable={{
            isSelected: d.name === current ? true : false,
            onClick: () => onSelect(d.name),
          }}
        />
      ))}
    </div>
  );
}

DatasourceSelector.propTypes = {
  onSelect: PropTypes.func.isRequired,
  datasources: PropTypes.array.isRequired,
  current: PropTypes.string.isRequired,
};
