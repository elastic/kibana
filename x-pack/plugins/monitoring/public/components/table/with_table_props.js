/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EUI_SORT_ASCENDING } from '../../../common/constants';
// import { Storage } from '../../../../../../src/legacy/ui/public/storage/storage';

// const storage = new Storage(window.localStorage);

export const withTableProps = (Component) => props => {
  let page; // todo: get from ls
  let sort;
  const pagination = page || {
    initialPageSize: 20,
    pageSizeOptions: [5, 10, 20, 50]
  };

  const sorting = sort || {
    sort: {
      field: 'name',
      direction: EUI_SORT_ASCENDING
    }
  };

  const onTableChange = (/*{ page, sort }*/) => {
    // setLocalStorageData(storage, {
    //   page,
    //   sort: {
    //     sort
    //   }
    // });
  };

  return (
    <Component
      pagination={pagination}
      sorting={sorting}
      onTableChange={onTableChange}
      {...props}
    />
  );
};
