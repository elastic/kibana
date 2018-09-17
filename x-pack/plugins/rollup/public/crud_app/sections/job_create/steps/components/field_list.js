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
  EuiEmptyPrompt,
} from '@elastic/eui';

export const FieldList = ({
  columns,
  fields,
  onRemoveField,
  addButton,
  emptyMessage,
}) => {
  let message;

  if (!fields.length) {
    message = (
      <EuiEmptyPrompt
        title={emptyMessage}
        titleSize="xs"
      />
    );
  }

  const extendedColumns = columns.concat({
    name: 'Remove',
    width: '80px',
    actions: [{
      name: 'Remove',
      isPrimary: true,
      description: 'Remove this field',
      icon: 'trash',
      type: 'icon',
      color: 'danger',
      onClick: (field) => onRemoveField(field),
    }]
  });

  const search = {
    toolsRight: addButton,
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
        columns={extendedColumns}
        search={search}
        pagination={pagination}
        sorting={true}
        message={message}
      />
    </Fragment>
  );
};

FieldList.propTypes = {
  columns: PropTypes.array.isRequired,
  fields: PropTypes.array.isRequired,
  onRemoveField: PropTypes.func.isRequired,
  addButton: PropTypes.node.isRequired,
  emptyMessage: PropTypes.node.isRequired,
};
