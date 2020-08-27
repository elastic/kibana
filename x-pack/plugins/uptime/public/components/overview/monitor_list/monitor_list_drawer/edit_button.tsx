/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButtonEmpty } from '@elastic/eui';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getMonitorCmData } from '../../../../state/actions/central_management';
import { centralManagementSelector } from '../../../../state/selectors';

interface EditButtonProps {
  monitorId: string;
}

export const EditButton: React.FC<EditButtonProps> = ({ monitorId }) => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(getMonitorCmData(monitorId));
  }, [dispatch, monitorId]);
  const { managedIdList } = useSelector(centralManagementSelector);
  return (
    <EditButtonComponent isDisabled={managedIdList.findIndex((id) => id === monitorId) === -1} />
  );
};

interface EditButtonComponentProps {
  isDisabled: boolean;
}

export const EditButtonComponent: React.FC<EditButtonComponentProps> = (props) => (
  <EuiButtonEmpty
    aria-label="Modify this monitor"
    {...props}
    onClick={() => {
      throw new Error('Not implemented');
    }}
  >
    Edit
  </EuiButtonEmpty>
);
