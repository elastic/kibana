/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions, useValues } from 'kea';

import { EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { LogRetentionLogic, LogRetentionOptions } from '../../log_retention';

import { GenericConfirmationModal } from './generic_confirmation_modal';

export const LogRetentionConfirmationModal: React.FC = () => {
  const CANNOT_BE_RECOVERED_TEXT = i18n.translate(
    'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.recovery',
    {
      defaultMessage: 'You cannot recover deleted data.',
    }
  );

  const DISABLE_TEXT = i18n.translate(
    'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.disable',
    {
      defaultMessage: 'DISABLE',
    }
  );

  const { closeModals, saveLogRetention } = useActions(LogRetentionLogic);

  const { logRetention, openedModal } = useValues(LogRetentionLogic);

  if (openedModal === null) {
    return null;
  }

  return (
    <>
      {openedModal === LogRetentionOptions.Analytics && (
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
            logRetention[LogRetentionOptions.Analytics].retentionPolicy?.minAgeDays &&
            i18n.translate(
              'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.analytics.subheading',
              {
                defaultMessage:
                  'Your Analytics Logs are currently being stored for {minAgeDays} days.',
                values: {
                  minAgeDays:
                    logRetention[LogRetentionOptions.Analytics].retentionPolicy?.minAgeDays,
                },
              }
            )
          }
          description={
            <>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.analytics.description',
                  {
                    defaultMessage:
                      'When you disable writing, engines stop logging analytics events. Your existing data is deleted according to the storage time frame.',
                  }
                )}
              </p>
              <p>
                <strong>
                  <EuiTextColor color="danger">{CANNOT_BE_RECOVERED_TEXT}</EuiTextColor>
                </strong>
              </p>
            </>
          }
          target={DISABLE_TEXT}
          onClose={closeModals}
          onSave={() => saveLogRetention(LogRetentionOptions.Analytics, false)}
        />
      )}
      {openedModal === LogRetentionOptions.API && (
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
            logRetention?.[LogRetentionOptions.API].retentionPolicy?.minAgeDays &&
            i18n.translate(
              'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.api.subheading',
              {
                defaultMessage: 'Your API Logs are currently being stored for {minAgeDays} days.',
                values: {
                  minAgeDays: logRetention?.[LogRetentionOptions.API].retentionPolicy?.minAgeDays,
                },
              }
            )
          }
          description={
            <>
              <p>
                {i18n.translate(
                  'xpack.enterpriseSearch.appSearch.settings.logRetention.modal.api.description',
                  {
                    defaultMessage:
                      'When you disable writing, engines stop logging API events. Your existing data is deleted according to the storage time frame.',
                  }
                )}
              </p>
              <p>
                <strong>
                  <EuiTextColor color="danger">{CANNOT_BE_RECOVERED_TEXT}</EuiTextColor>
                </strong>
              </p>
            </>
          }
          target={DISABLE_TEXT}
          onClose={closeModals}
          onSave={() => saveLogRetention(LogRetentionOptions.API, false)}
        />
      )}
    </>
  );
};
