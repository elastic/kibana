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

import { EntSearchLogStream } from '../../../../../shared/log_stream';

import { AuditLogsModalLogic } from './audit_logs_modal_logic';

import './audit_logs_modal.scss';

export const AuditLogsModal: React.FC = () => {
  const auditLogsModalLogic = AuditLogsModalLogic();
  const { isModalVisible, engineName } = useValues(auditLogsModalLogic);
  const { hideModal } = useActions(auditLogsModalLogic);

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
              type: 'message',
            },
            {
              type: 'field',
              field: 'event.type',
            },
            {
              type: 'field',
              field: 'user.id',
            },
            {
              type: 'field',
              field: 'event.dataset',
            },
            {
              type: 'field',
              field: 'enterprisesearch.data_repository.name',
            },
          ]}
          query={`event.kind: event and event.dataset: enterprise-search-audit and enterprisesearch.data_repository.name: ${engineName}`}
        />
      </EuiModalBody>

      <EuiModalFooter>
        <EuiButton onClick={hideModal} fill>
          Close
        </EuiButton>
      </EuiModalFooter>
    </EuiModal>
  );
};
