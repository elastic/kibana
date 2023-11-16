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
        application?.navigateToApp('synthetics');
      }}
      confirmButtonText={GO_SYNTHETICS_TEXT}
      cancelButtonText={GO_BACK_TEXT}
    >
      <p>
        <FormattedMessage
          id="xpack.uptime.deprecateNoticeModal.description"
          defaultMessage="The Elastic Synthetics integration is deprecated. Instead, you can now monitor endpoints,
        pages, and user journeys directly in the Synthetics app much more efficiently:"
        />
      </p>
      <p>
        <li>
          <FormattedMessage
            id="xpack.uptime.deprecateNoticeModal.addPrivateLocations"
            defaultMessage="Add private locations against your fleet policies"
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.uptime.deprecateNoticeModal.manageMonitors"
            defaultMessage="Manage lightweight and browser monitors from a single place"
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.uptime.deprecateNoticeModal.elasticManagedLocations"
            defaultMessage="Run monitors in multiple locations managed by Elastic, or from your own private locations"
          />
        </li>
        <li>
          <FormattedMessage
            id="xpack.uptime.deprecateNoticeModal.automateMonitors"
            defaultMessage="Automate the creation of your monitors using project monitors"
          />
        </li>
      </p>
      <p>
        <FormattedMessage
          id="xpack.uptime.deprecateNoticeModal.forMoreInformation"
          defaultMessage="For more information, {docsLink}"
          values={{
            docsLink: (
              <EuiLink
                data-test-subj="syntheticsDeprecateNoticeModalLink"
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

const HEADER_TEXT = i18n.translate('xpack.uptime.deprecateNoticeModal.headerText', {
  defaultMessage: 'Synthetic Monitoring is now available out of the box in Synthetics',
});

const GO_BACK_TEXT = i18n.translate('xpack.uptime.deprecateNoticeModal.goBack', {
  defaultMessage: 'Go back',
});

const READ_DOCS_TEXT = i18n.translate('xpack.uptime.deprecateNoticeModal.readDocs', {
  defaultMessage: 'read docs.',
});

const GO_SYNTHETICS_TEXT = i18n.translate('xpack.uptime.deprecateNoticeModal.goToSynthetics', {
  defaultMessage: 'Go to Synthetics',
});
