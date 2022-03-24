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
import { useSyntheticsServiceAllowed } from './hooks/use_service_allowed';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export const AddMonitorBtn = () => {
  const history = useHistory();

  const { isAllowed, loading } = useSyntheticsServiceAllowed();

  const canSave: boolean = !!useKibana().services?.application?.capabilities.uptime.save;

  return (
    <EuiFlexItem style={{ alignItems: 'flex-end' }} grow={false} data-test-subj="addMonitorButton">
      <EuiButton
        fill
        isLoading={loading}
        isDisabled={!canSave || !isAllowed}
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
