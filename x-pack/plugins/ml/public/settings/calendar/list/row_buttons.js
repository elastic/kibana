/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */


import PropTypes from 'prop-types';
import React, { Fragment } from 'react';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { checkPermission } from '../../../privilege/check_privilege';

function DeleteButton({ onClick }) {
  const canDeleteCalendar = checkPermission('canDeleteCalendar');

  return (
    <Fragment>
      <EuiButtonEmpty
        size="xs"
        color="danger"
        iconType="trash"
        onClick={onClick}
        isDisabled={canDeleteCalendar === false}
      >
        Delete
      </EuiButtonEmpty>
    </Fragment>
  );
}

function EditButton({ editUrl }) {
  return (
    <Fragment>
      <EuiButtonEmpty
        size="xs"
        color="text"
        iconType="pencil"
        href={editUrl}
      >
        Edit
      </EuiButtonEmpty>
    </Fragment>
  );
}

export function RowButtons({ onDeleteClick, editUrl }) {
  return (
    <EuiFlexGroup gutterSize="none">
      <EuiFlexItem grow={false}>
        <EditButton editUrl={editUrl} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <DeleteButton onClick={onDeleteClick} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

RowButtons.propTypes = {
  onDeleteClick: PropTypes.func.isRequired,
  editUrl: PropTypes.string.isRequired,
};
