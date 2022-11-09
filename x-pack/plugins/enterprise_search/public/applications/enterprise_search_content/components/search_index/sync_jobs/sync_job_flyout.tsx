/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { SyncJobDocumentsPanel } from './documents_panel';
import { SyncJobEventsPanel } from './events_panel';
import { FilteringPanel } from './filtering_panel';
import { FlyoutPanel } from './flyout_panel';
import { PipelinePanel } from './pipeline_panel';
import { SyncJobCallouts } from './sync_callouts';
import { SyncJobView } from './sync_jobs_view_logic';

interface SyncJobFlyoutProps {
  onClose: () => void;
  syncJob?: SyncJobView;
}

export const SyncJobFlyout: React.FC<SyncJobFlyoutProps> = ({ onClose, syncJob }) => {
  const visible = !!syncJob;
  return visible ? (
    <EuiFlyout onClose={onClose}>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.title', {
              defaultMessage: 'Event log',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFlexGroup direction="column">
          <SyncJobCallouts syncJob={syncJob} />
          <EuiFlexItem>
            <FlyoutPanel
              title={i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.sync', {
                defaultMessage: 'Sync',
              })}
            >
              <EuiBasicTable
                columns={[
                  {
                    field: 'id',
                    name: i18n.translate('xpack.enterpriseSearch.content.syncJobs.flyout.sync.id', {
                      defaultMessage: 'ID',
                    }),
                  },
                ]}
                items={[{ id: syncJob.id }]}
              />
            </FlyoutPanel>
          </EuiFlexItem>
          <EuiFlexItem>
            <SyncJobDocumentsPanel
              added={syncJob.indexed_document_count}
              total={0}
              removed={syncJob.deleted_document_count}
              volume={syncJob.indexed_document_volume ?? 0}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <SyncJobEventsPanel
              canceledAt={syncJob.canceled_at ?? ''}
              cancelationRequestedAt={syncJob.cancelation_requested_at ?? ''}
              syncRequestedAt={syncJob.created_at}
              syncStarted={syncJob.started_at}
              completed={syncJob.completed_at ?? ''}
              lastUpdated={syncJob.last_seen}
              triggerMethod={syncJob.trigger_method}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <FilteringPanel
              advancedSnippet={syncJob.filtering?.advanced_snippet}
              filteringRules={syncJob.filtering?.rules ?? []}
            />
          </EuiFlexItem>
          {syncJob.pipeline && (
            <EuiFlexItem>
              <PipelinePanel pipeline={syncJob.pipeline} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  ) : (
    <></>
  );
};
