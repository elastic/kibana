/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { MONITOR_ADD_ROUTE } from '../../../common/constants';

export const AddMonitorBtn = () => {
  const history = useHistory();

  return (
    <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false} data-test-subj="addMonitorButton">
      <EuiButton
        fill
        iconType="plus"
        data-test-subj="superDatePickerApplyTimeButton"
        href={history.createHref({
          pathname: MONITOR_ADD_ROUTE,
        })}
      >
        Add monitor
      </EuiButton>
    </EuiFlexItem>
  );
};
