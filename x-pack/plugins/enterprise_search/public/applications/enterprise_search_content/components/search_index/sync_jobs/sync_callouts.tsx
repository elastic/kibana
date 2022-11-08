/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexItem, EuiCallOut } from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SyncStatus, TriggerMethod } from '../../../../../../common/types/connectors';

import { dateToString } from '../../../utils/date_to_string';
import { durationToText } from '../../../utils/duration_to_text';

import { SyncJobView } from './sync_jobs_view_logic';

interface SyncJobCalloutsProps {
  syncJob: SyncJobView;
}

export const SyncJobCallouts: React.FC<SyncJobCalloutsProps> = ({ syncJob }) => {
  return (
    <>
      {!!syncJob.completed_at && (
        <EuiFlexItem>
          <EuiCallOut
            color="success"
            iconType="check"
            title={i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.completedTitle', {
              defaultMessage: 'Sync complete',
            })}
          >
            {i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.completedDescription', {
              defaultMessage: 'Completed at {date}',
              values: {
                date: dateToString(syncJob.completed_at),
              },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {syncJob.status === SyncStatus.ERROR && (
        <EuiFlexItem>
          <EuiCallOut
            color="danger"
            iconType="cross"
            title={i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.failureTitle', {
              defaultMessage: 'Sync failure',
            })}
          >
            {i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.failureDescription', {
              defaultMessage: 'Sync failure: {error}.',
              values: {
                error: syncJob.error,
              },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {syncJob.status === SyncStatus.CANCELED && (
        <EuiFlexItem>
          <EuiCallOut
            color="danger"
            iconType="cross"
            title={i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.canceledTitle', {
              defaultMessage: 'Sync canceled',
            })}
          >
            {i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.canceledDescription', {
              defaultMessage: 'Sync canceled at {date}.',
              values: {
                date: dateToString(syncJob.canceled_at ?? ''),
              },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {syncJob.status === SyncStatus.IN_PROGRESS && (
        <EuiFlexItem>
          <EuiCallOut
            color="warning"
            iconType="clock"
            title={i18n.translate(
              'xpack.enterpriseSearch.content.syncJobs.flyout.inProgressTitle',
              {
                defaultMessage: 'In progress',
              }
            )}
          >
            {i18n.translate(
              'xpack.enterpriseSearch.content.syncJobs.flyout.inProgressDescription',
              {
                defaultMessage: 'Sync has been running for {duration}.',
                values: {
                  duration: durationToText(syncJob.duration),
                },
              }
            )}
          </EuiCallOut>
        </EuiFlexItem>
      )}
      {!!syncJob.started_at && (
        <EuiFlexItem>
          <EuiCallOut
            color="primary"
            iconType="iInCircle"
            title={
              syncJob.trigger_method === TriggerMethod.ON_DEMAND
                ? i18n.translate(
                    'xpack.enterpriseSearch.content.syncJobs.flyout.syncStartedManually',
                    {
                      defaultMessage: 'Sync started manually',
                    }
                  )
                : i18n.translate(
                    'xpack.enterpriseSearch.content.syncJobs.flyout.syncStartedScheduled',
                    {
                      defaultMessage: 'Sync started by schedule',
                    }
                  )
            }
          >
            {i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.startedAtDescription', {
              defaultMessage: 'Started at {date}.',
              values: {
                date: dateToString(syncJob.started_at),
              },
            })}
          </EuiCallOut>
        </EuiFlexItem>
      )}
    </>
  );
};
