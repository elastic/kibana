/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { last } from 'lodash';

const defaultPerRow = 6;

export const ItemGrid = ({ items, itemsPerRow, children }) => {
  if (!items) {
    return null;
  }

  const rows = items.reduce(
    (rows, item) => {
      if (last(rows).length >= (itemsPerRow || defaultPerRow)) {
        rows.push([]);
      }

      last(rows).push(children({ item }));

      return rows;
    },
    [[]]
  );

  return rows.map((row, i) => (
    <div key={`item-grid-row-${i}`} className="item-grid-row">
      {row}
    </div>
  ));
};

ItemGrid.propTypes = {
  items: PropTypes.array.isRequired,
  itemsPerRow: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  children: PropTypes.func.isRequired,
};
