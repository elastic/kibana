/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { last } from 'lodash';
import PropTypes from 'prop-types';
import React, { Fragment, ReactElement, ValidationMap } from 'react';

const PER_ROW_DEFAULT = 6;

export interface Props<T> {
  /** A collection of 'things' to be iterated upon by the children prop function. */
  items: T[];
  /**
   * The number of items per row.
   * @default 6
   */
  itemsPerRow?: number;
  /** A function with which to iterate upon the items collection, producing nodes. */
  children: (item: T) => ReactElement<any>;
}

// We need this type in order to define propTypes on the object.  It's a bit redundant,
// but TS needs to know that ItemGrid can have propTypes defined on it.
interface ItemGridType {
  <T>(props: Props<T>): ReactElement<any>;
  propTypes?: ValidationMap<Props<any>>;
}

export const ItemGrid: ItemGridType = function ItemGridFunc<T>({
  items = [],
  itemsPerRow = PER_ROW_DEFAULT,
  children,
}: Props<T>) {
  const reducedRows = items.reduce(
    (rows: Array<Array<ReactElement<any>>>, item: any) => {
      if (last(rows).length >= itemsPerRow) {
        rows.push([]);
      }

      last(rows).push(children(item));

      return rows;
    },
    [[]] as Array<Array<ReactElement<any>>>
  );

  return (
    <Fragment>
      {reducedRows.map((row, i) => (
        <div key={`item-grid-row-${i}`} className="item-grid-row">
          {row}
        </div>
      ))}
    </Fragment>
  );
};

ItemGrid.propTypes = {
  items: PropTypes.array,
  itemsPerRow: PropTypes.number,
  children: PropTypes.func.isRequired,
};
