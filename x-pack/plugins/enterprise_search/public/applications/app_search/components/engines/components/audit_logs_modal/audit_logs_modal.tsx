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
  EuiSpacer,
  EuiText,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID } from '../../../../../../../common/constants';
import { EntSearchLogStream } from '../../../../../shared/log_stream';

import { AuditLogsModalLogic } from './audit_logs_modal_logic';

import './audit_logs_modal.scss';

export const AuditLogsModal: React.FC = () => {
  const auditLogsModalLogic = AuditLogsModalLogic();
  const { isModalVisible, engineName } = useValues(auditLogsModalLogic);
  const { hideModal } = useActions(auditLogsModalLogic);

  const filters = [
    'event.kind: event',
    'event.action: audit',
    `enterprisesearch.data_repository.name: ${engineName}`,
  ].join(' and ');

  return !isModalVisible ? null : (
    <EuiModal onClose={hideModal} className="auditLogsModal" maxWidth={false}>
      <EuiModalHeader>
        <EuiModalHeaderTitle>
          <h1>{engineName}</h1>
        </EuiModalHeaderTitle>
      </EuiModalHeader>
      <EuiModalBody>
        <EuiText size="s">
          {i18n.translate('xpack.enterpriseSearch.appSearch.engines.auditLogsModal.eventTip', {
            defaultMessage: 'Showing events from last 24 hours',
          })}
        </EuiText>
        <EuiSpacer size="m" />
        <EntSearchLogStream
          sourceId={ENTERPRISE_SEARCH_AUDIT_LOGS_SOURCE_ID}
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
              width: '50%',
            },
          ]}
          query={filters}
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
