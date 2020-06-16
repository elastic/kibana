/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { PaginateProps } from './';

export const Paginate: React.FunctionComponent<PaginateProps> = (props) => {
  return (
    <React.Fragment>
      {props.children({
        rows: props.rows,
        perPage: props.perPage,
        pageNumber: props.pageNumber,
        totalPages: props.totalPages,
        nextPageEnabled: props.nextPageEnabled,
        prevPageEnabled: props.prevPageEnabled,
        setPage: props.setPage,
        nextPage: props.nextPage,
        prevPage: props.prevPage,
      })}
    </React.Fragment>
  );
};

Paginate.propTypes = {
  children: PropTypes.func.isRequired,
  rows: PropTypes.array.isRequired,
  perPage: PropTypes.number.isRequired,
  pageNumber: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  nextPageEnabled: PropTypes.bool.isRequired,
  prevPageEnabled: PropTypes.bool.isRequired,
  setPage: PropTypes.func.isRequired,
  nextPage: PropTypes.func.isRequired,
  prevPage: PropTypes.func.isRequired,
};
