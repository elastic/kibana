/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable,
  EuiSpacer,
} from '@elastic/eui';

import './field_chooser.less';

export const FieldList = ({
  fields,
  onRemoveField,
}) => {
  if (!fields.length) {
    return null;
  }

  const columns = [{
    field: 'name',
    name: 'Name',
    truncateText: true,
    sortable: true,
  }, {
    field: 'type',
    name: 'Type',
    truncateText: true,
    sortable: true,
    width: '180px',
  }, {
    name: 'Remove',
    width: '80px',
    actions: [{
      name: 'Remove',
      isPrimary: true,
      description: 'Remove this field',
      icon: 'cross',
      type: 'icon',
      color: 'danger',
      onClick: (field) => onRemoveField(field),
    }]
  }];

  const search = {
    box: {
      incremental: true,
    },
  };

  const pagination = {
    initialPageSize: 200,
    pageSizeOptions: [20, 100, 200]
  };

  return (
    <Fragment>
      <EuiSpacer />

      <EuiInMemoryTable
        items={fields}
        itemId="name"
        columns={columns}
        search={search}
        pagination={pagination}
        sorting={true}
      />
    </Fragment>
  );
};

FieldList.propTypes = {
  fields: PropTypes.array.isRequired,
  onRemoveField: PropTypes.func.isRequired,
};
