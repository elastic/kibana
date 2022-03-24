/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useValues, useActions } from 'kea';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiLinkTo } from '../../../../shared/react_router_helpers';

import { AppLogic } from '../../../app_logic';
import { SETTINGS_PATH } from '../../../routes';
import { ANALYTICS_TITLE } from '../../analytics';
import { API_LOGS_TITLE } from '../../api_logs';
import { CRAWLER_TITLE } from '../../crawler';

import { LogRetentionLogic, LogRetentionOptions, renderLogRetentionDate } from '../index';

export const AUDIT_LOGS_TITLE = i18n.translate('xpack.enterpriseSearch.appSearch.audit.title', {
  defaultMessage: 'Audit',
});

const TITLE_MAP = {
  [LogRetentionOptions.Analytics]: ANALYTICS_TITLE,
  [LogRetentionOptions.API]: API_LOGS_TITLE,
  [LogRetentionOptions.Audit]: AUDIT_LOGS_TITLE,
  [LogRetentionOptions.Crawler]: CRAWLER_TITLE,
};

interface Props {
  type: LogRetentionOptions;
}
export const LogRetentionCallout: React.FC<Props> = ({ type }) => {
  const { fetchLogRetention } = useActions(LogRetentionLogic);
  const { logRetention } = useValues(LogRetentionLogic);
  const {
    myRole: { canManageLogSettings },
  } = useValues(AppLogic);

  const hasLogRetention = logRetention !== null;

  useEffect(() => {
    if (!hasLogRetention && canManageLogSettings) fetchLogRetention();
  }, []);

  const logRetentionSettings = logRetention?.[type];
  const title = TITLE_MAP[type];
  const hasLogRetentionDisabled = hasLogRetention && !logRetentionSettings?.enabled;

  return hasLogRetentionDisabled ? (
    <>
      <EuiCallOut
        iconType="alert"
        color="primary"
        title={
          logRetentionSettings?.disabledAt ? (
            <FormattedMessage
              id="xpack.enterpriseSearch.appSearch.logRetention.callout.disabledSinceTitle"
              defaultMessage="{logsTitle} have been disabled since {disabledDate}."
              values={{
                logsTitle: title,
                disabledDate: renderLogRetentionDate(logRetentionSettings.disabledAt),
              }}
            />
          ) : (
            i18n.translate('xpack.enterpriseSearch.appSearch.logRetention.callout.disabledTitle', {
              defaultMessage: '{logsTitle} have been disabled.',
              values: {
                logsTitle: title,
              },
            })
          )
        }
      >
        <p>
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.logRetention.callout.description.manageSettingsDetail"
            defaultMessage="To manage analytics & logging, {visitSettingsLink}."
            values={{
              visitSettingsLink: (
                <EuiLinkTo to={SETTINGS_PATH}>
                  {i18n.translate(
                    'xpack.enterpriseSearch.appSearch.logRetention.callout.description.manageSettingsLinkText',
                    { defaultMessage: 'visit your settings' }
                  )}
                </EuiLinkTo>
              ),
            }}
          />
        </p>
      </EuiCallOut>
      <EuiSpacer />
    </>
  ) : null;
};
