/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Paginate as Component, PaginateProps, PaginateChildProps } from './paginate';

export { PaginateProps, PaginateChildProps };
export interface InPaginateProps {
  perPage?: number;
  startPage?: number;
  rows: any[];
  children: (props: PaginateChildProps) => React.ReactNode;
}

export const Paginate: React.FunctionComponent<InPaginateProps> = ({
  perPage = 10,
  startPage = 0,
  rows,
  children,
}) => {
  const totalPages = Math.ceil(rows.length / perPage);
  const initialCurrentPage = totalPages > 0 ? Math.min(startPage, totalPages - 1) : 0;
  const [currentPage, setPage] = useState(initialCurrentPage);
  const hasRenderedRef = useRef<boolean>(false);
  const maxPage = totalPages - 1;
  const start = currentPage * perPage;
  const end = currentPage === 0 ? perPage : perPage * (currentPage + 1);
  const nextPageEnabled = currentPage < maxPage;
  const prevPageEnabled = currentPage > 0;
  const partialRows = rows.slice(start, end);

  const nextPage = () => {
    if (nextPageEnabled) {
      setPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (prevPageEnabled) {
      setPage(currentPage - 1);
    }
  };

  useEffect(() => {
    if (!hasRenderedRef.current) {
      hasRenderedRef.current = true;
    } else {
      setPage(0);
    }
  }, [perPage, hasRenderedRef]);

  return (
    <Component
      rows={partialRows}
      perPage={perPage}
      pageNumber={currentPage}
      totalPages={totalPages}
      setPage={setPage}
      nextPage={nextPage}
      prevPage={prevPage}
      nextPageEnabled={nextPageEnabled}
      prevPageEnabled={prevPageEnabled}
      children={children}
    />
  );
};

Paginate.propTypes = {
  rows: PropTypes.array.isRequired,
  perPage: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  startPage: PropTypes.number,
};
