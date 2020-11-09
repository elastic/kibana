/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';

import { EuiTextColor, EuiOverlayMask } from '@elastic/eui';
import { useActions, useValues } from 'kea';

import { GenericConfirmationModal } from './generic_confirmation_modal';
import { LogRetentionLogic } from './log_retention_logic';

import { ELogRetentionOptions } from './types';

export const LogRetentionConfirmationModal: React.FC = () => {
  const CANNOT_BE_RECOVERED = i18n.translate(
    'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.recovery',
    {
      defaultMessage: 'cannot be recovered',
    }
  );

  const { closeModals, saveLogRetention } = useActions(LogRetentionLogic);

  const { logRetention, openedModal } = useValues(LogRetentionLogic);

  if (openedModal === null) {
    return null;
  }

  return (
    <EuiOverlayMask>
      {openedModal === ELogRetentionOptions.Analytics && (
        <GenericConfirmationModal
          data-test-subj="AnalyticsLogRetentionConfirmationModal"
          title={i18n.translate(
            'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.analytics.title',
            {
              defaultMessage: 'Disable Analytics writes',
            }
          )}
          subheading={
            logRetention &&
            logRetention[ELogRetentionOptions.Analytics].retentionPolicy?.minAgeDays &&
            i18n.translate(
              'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.analytics.subheading',
              {
                defaultMessage:
                  'Your Analytics Logs are currently being stored for {minAgeDays} days.',
                values: {
                  minAgeDays:
                    logRetention[ELogRetentionOptions.Analytics].retentionPolicy?.minAgeDays,
                },
              }
            )
          }
          description={
            <>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.analytics.description',
                {
                  defaultMessage:
                    'When disabling Analytics Logs, all your engines will immediately stop indexing Analytics Logs. Your existing data will be deleted in accordance with the storage timeframes outlined above. Once your data has been removed, it',
                }
              )}{' '}
              <strong>
                <EuiTextColor color="danger">{CANNOT_BE_RECOVERED}</EuiTextColor>
              </strong>
              .
            </>
          }
          target="DISABLE"
          onClose={closeModals}
          onSave={() => saveLogRetention(ELogRetentionOptions.Analytics, false)}
        />
      )}
      {openedModal === ELogRetentionOptions.API && (
        <GenericConfirmationModal
          data-test-subj="APILogRetentionConfirmationModal"
          title={i18n.translate(
            'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.api.title',
            {
              defaultMessage: 'Disable API writes',
            }
          )}
          subheading={
            logRetention &&
            logRetention?.[ELogRetentionOptions.API].retentionPolicy?.minAgeDays &&
            i18n.translate(
              'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.api.subheading',
              {
                defaultMessage: 'Your API Logs are currently being stored for {minAgeDays} days.',
                values: {
                  minAgeDays: logRetention?.[ELogRetentionOptions.API].retentionPolicy?.minAgeDays,
                },
              }
            )
          }
          description={
            <>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.api.description',
                {
                  defaultMessage:
                    'When disabling API Logs, all your engines will immediately stop indexing API Logs. Your existing data will be deleted in accordance with the storage timeframes outlined above. Once your data has been removed, it',
                }
              )}{' '}
              <strong>
                <EuiTextColor color="danger">{CANNOT_BE_RECOVERED}</EuiTextColor>
              </strong>
              .
            </>
          }
          target="DISABLE"
          onClose={closeModals}
          onSave={() => saveLogRetention(ELogRetentionOptions.API, false)}
        />
      )}
    </EuiOverlayMask>
  );
};
