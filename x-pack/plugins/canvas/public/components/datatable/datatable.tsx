/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import PropTypes from 'prop-types';
import { EuiIcon, EuiPagination } from '@elastic/eui';
import moment from 'moment';
import { Paginate } from '../paginate';
import { Datatable as DatatableType, DatatableColumn, DatatableColumnType } from '../../../types';

const getIcon = (type: DatatableColumnType | null) => {
  if (type === null) {
    return;
  }

  let icon;
  switch (type) {
    case 'string':
      icon = 'string';
      break;
    case 'number':
      icon = 'number';
      break;
    case 'date':
      icon = 'calendar';
      break;
    case 'boolean':
      icon = 'invert';
      break;
    default:
      icon = 'questionInCircle';
  }

  return <EuiIcon type={icon} color="subdued" />;
};

const getColumnName = (col: DatatableColumn) => (typeof col === 'string' ? col : col.name);

const getColumnType = (col: DatatableColumn) => col.meta?.type || null;

const getFormattedValue = (val: any, type: any) => {
  if (type === 'date') {
    return moment(val).format();
  }
  return String(val);
};

interface Props {
  datatable: DatatableType;
  paginate?: boolean;
  perPage?: number;
  showHeader?: boolean;
}

export const Datatable: FC<Props> = ({
  datatable,
  paginate = false,
  perPage = 10,
  showHeader = false,
}) => (
  <Paginate rows={datatable.rows} perPage={perPage}>
    {({ rows, setPage, pageNumber, totalPages }) => (
      <div className="canvasDataTable">
        <div className="canvasDataTable__tableWrapper">
          <table className="canvasDataTable__table">
            {!showHeader ? null : (
              <thead className="canvasDataTable__thead">
                <tr className="canvasDataTable__tr">
                  {datatable.columns.map((col) => (
                    <th key={`header-${getColumnName(col)}`} className="canvasDataTable__th">
                      {getColumnName(col)}
                      &nbsp;
                      {getIcon(getColumnType(col))}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="canvasDataTable__tbody">
              {rows.map((row, i) => (
                <tr key={i} className="canvasDataTable__tr">
                  {datatable.columns.map((col) => (
                    <td key={`row-${i}-${getColumnName(col)}`} className="canvasDataTable__td">
                      {getFormattedValue(row[getColumnName(col)], getColumnType(col))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {paginate && (
          <div className="canvasDataTable__footer">
            <EuiPagination pageCount={totalPages} activePage={pageNumber} onPageClick={setPage} />
          </div>
        )}
      </div>
    )}
  </Paginate>
);

Datatable.propTypes = {
  datatable: PropTypes.object.isRequired,
  paginate: PropTypes.bool,
  perPage: PropTypes.number,
  showHeader: PropTypes.bool,
};
