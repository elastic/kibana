/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import { EuiPanel, EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { ApiLogsLogic } from '..';

import './new_api_events_prompt.scss';

export const NewApiEventsPrompt: React.FC = () => {
  const { hasNewData } = useValues(ApiLogsLogic);
  const { onUserRefresh } = useActions(ApiLogsLogic);

  return hasNewData ? (
    <EuiPanel color="subdued" hasShadow={false} paddingSize="s" className="newApiEventsPrompt">
      {i18n.translate('xpack.enterpriseSearch.appSearch.engines.apiLogs.newEventsMessage', {
        defaultMessage: 'New events have been logged.',
      })}
      <EuiButtonEmpty iconType="refresh" size="xs" onClick={onUserRefresh}>
        {i18n.translate('xpack.enterpriseSearch.appSearch.engines.apiLogs.newEventsButtonLabel', {
          defaultMessage: 'Refresh',
        })}
      </EuiButtonEmpty>
    </EuiPanel>
  ) : null;
};
