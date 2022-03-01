/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';

import {
  EuiButton,
  EuiModal,
  EuiModalBody,
  EuiModalFooter,
  EuiModalHeader,
  EuiModalHeaderTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EntSearchLogStream } from '../../../../../shared/log_stream';

import { AuditLogsModalLogic } from './audit_logs_modal_logic';

import './audit_logs_modal.scss';

export const AuditLogsModal: React.FC = () => {
  const auditLogsModalLogic = AuditLogsModalLogic();
  const { isModalVisible, engineName } = useValues(auditLogsModalLogic);
  const { hideModal } = useActions(auditLogsModalLogic);

  const filters = [
    'event.kind: event',
    'event.dataset: enterprise-search-audit',
    `enterprisesearch.data_repository.name: ${engineName}`,
  ];

  return !isModalVisible ? null : (
    <EuiModal onClose={hideModal} className="auditLogsModal" maxWidth={false}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{engineName}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>

      <EuiModalBody>
        <EntSearchLogStream
          columns={[
            {
              type: 'timestamp',
            },
            {
              type: 'field',
              field: 'user.id',
              header: i18n.translate(
                'xpack.enterpriseSearch.appSearch.engines.auditLogsModal.headers.updatedBy',
                {
                  defaultMessage: 'Updated By',
                }
              ),
            },
            {
              type: 'field',
              field: 'event.category',
              header: i18n.translate(
                'xpack.enterpriseSearch.appSearch.engines.auditLogsModal.headers.eventCategory',
                {
                  defaultMessage: 'Event Category',
                }
              ),
            },
            {
              type: 'field',
              field: 'event.type',
              header: i18n.translate(
                'xpack.enterpriseSearch.appSearch.engines.auditLogsModal.headers.eventType',
                {
                  defaultMessage: 'Event Type',
                }
              ),
            },
            {
              type: 'field',
              field: 'outcome',
              header: i18n.translate(
                'xpack.enterpriseSearch.appSearch.engines.auditLogsModal.headers.outcome',
                {
                  defaultMessage: 'Outcome',
                }
              ),
            },
            {
              type: 'message',
            },
          ]}
          query={filters.join(' and ')}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={hideModal} fill>
          {i18n.translate('xpack.enterpriseSearch.appSearch.engines.auditLogsModal.closeButton', {
            defaultMessage: 'Close',
          })}
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
