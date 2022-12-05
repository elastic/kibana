/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiIcon, EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const DeprecateNoticeModal = ({ onCancel }: { onCancel: () => void }) => {
  const { application } = useKibana().services;

  return (
    <EuiConfirmModal
      title={
        <>
          {HEADER_TEXT} <EuiIcon type="cheer" />
        </>
      }
      onCancel={onCancel}
      onConfirm={() => {
        application?.navigateToApp('uptime', { path: '/manage-monitors' });
      }}
      confirmButtonText={GO_MONITOR_MANAGEMENT_TEXT}
      cancelButtonText={GO_BACK_TEXT}
    >
      <p>
        <FormattedMessage
          id="xpack.synthetics.deprecateNoticeModal.description"
          defaultMessage="The Elastic Synthetics integration is deprecated. Instead, you can now monitor endpoints,
        pages, and user journeys directly from Uptime much more efficiently:"
        />
      </p>
      <p>
        <li>
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.addPrivateLocations"
            defaultMessage="Add private locations against your fleet policies"
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.manageMonitors"
            defaultMessage="Manage lightweight and browser monitors from a single place"
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.elasticManagedLocations"
            defaultMessage="Run monitors in multiple locations managed by Elastic, or from your own private locations"
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.automateMonitors"
            defaultMessage="Automate the creation of your monitors using project monitors"
          />
        </li>
      </p>
      <p>
        <FormattedMessage
          id="xpack.synthetics.deprecateNoticeModal.forMoreInformation"
          defaultMessage="For more information, {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                target="_blank"
                href="https://www.elastic.co/guide/en/observability/current/monitor-uptime-synthetics.html"
              >
                {READ_DOCS_TEXT}
              </EuiLink>
            ),
          }}
        />
      </p>
    </EuiConfirmModal>
  );
};

const HEADER_TEXT = i18n.translate('xpack.synthetics.deprecateNoticeModal.headerText', {
  defaultMessage: 'Synthetic Monitoring is now available out of the box in Uptime',
});

const GO_BACK_TEXT = i18n.translate('xpack.synthetics.deprecateNoticeModal.goBack', {
  defaultMessage: 'Go back',
});

const READ_DOCS_TEXT = i18n.translate('xpack.synthetics.deprecateNoticeModal.readDocs', {
  defaultMessage: 'read docs.',
});

const GO_MONITOR_MANAGEMENT_TEXT = i18n.translate(
  'xpack.synthetics.deprecateNoticeModal.goToMonitorManagement',
  {
    defaultMessage: 'Go to Monitor Management',
  }
);
