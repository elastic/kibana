/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiButton, EuiFlexItem } from '@elastic/eui';
import { useHistory } from 'react-router-dom';
import { MONITOR_ADD_ROUTE } from '../../../common/constants';

export const AddMonitorBtn = ({ isDisabled }: { isDisabled: boolean }) => {
  const history = useHistory();

  return (
    <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false} data-test-subj="addMonitorButton">
      <EuiButton
        fill
        isDisabled={isDisabled}
        iconType="plus"
        data-test-subj="addMonitorBtn"
        href={history.createHref({
          pathname: MONITOR_ADD_ROUTE,
        })}
      >
        {ADD_MONITOR_LABEL}
      </EuiButton>
    </EuiFlexItem>
  );
};

const ADD_MONITOR_LABEL = i18n.translate('xpack.uptime.monitorManagement.addMonitorLabel', {
  defaultMessage: 'Add monitor',
});
