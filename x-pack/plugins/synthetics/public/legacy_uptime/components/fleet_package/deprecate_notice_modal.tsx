/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiConfirmModal, EuiIcon, EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useLocation } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { PrivateLocationDocsLink } from '../monitor_management/manage_locations/empty_locations';

export const DeprecateNoticeModal = () => {
  const { application } = useKibana().services;
  const location = useLocation();

  return (
    <EuiConfirmModal
      title={
        <>
          {HEADER_TEXT} <EuiIcon type="cheer" />
        </>
      }
      onCancel={() => {
        const [app, options] = location.state.onCancelNavigateTo;
        application?.navigateToApp(app, options);
      }}
      onConfirm={() => {
        application?.navigateToApp('uptime', { path: '/manage-monitors' });
      }}
      confirmButtonText={GO_MONITOR_MANAGEMENT_TEXT}
      cancelButtonText={GO_BACK_TEXT}
    >
      <p>
        <FormattedMessage
          id="xpack.synthetics.deprecateNoticeModal.description"
          defaultMessage="We no longer support adding synthetics monitors via synthetics integration. We have a new
        and a better way to add monitors via uptime app, where you can"
        />
      </p>
      <p>
        <li>
          <PrivateLocationDocsLink label={ADD_PRIVATE_LOCATIONS_TEXT} /> {POLICIES_TEXT}
        </li>
        <li>
          <ManageMonitorDocsLink />
        </li>
        <li>
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.runYourMonitors"
            defaultMessage="In Elastic cloud run your monitors against Elastic managed global locations"
          />
        </li>
        <li>
          <ProjectMonitorDocsLink />
        </li>
      </p>
    </EuiConfirmModal>
  );
};

export const ManageMonitorDocsLink = ({ label }: { label?: string }) => (
  <FormattedMessage
    id="xpack.synthetics.deprecateNoticeModal.manageMonitors"
    defaultMessage="Manage lightweight or browser monitors via {link}"
    values={{
      link: (
        <EuiLink
          href="hhttps://www.elastic.co/guide/en/observability/current/synthetics-manage-monitors.html"
          target="_blank"
        >
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.uptimeApp"
            defaultMessage="Uptime app"
          />
        </EuiLink>
      ),
    }}
  />
);

export const ProjectMonitorDocsLink = ({ label }: { label?: string }) => (
  <FormattedMessage
    id="xpack.synthetics.deprecateNoticeModal.runYourMonitors"
    defaultMessage="Automate adding monitors via {link}"
    values={{
      link: (
        <EuiLink
          href="https://www.elastic.co/guide/en/observability/current/uptime-set-up-choose-project-monitors.html"
          target="_blank"
        >
          <FormattedMessage
            id="xpack.synthetics.deprecateNoticeModal.projectMonitors"
            defaultMessage="Project Monitors"
          />
        </EuiLink>
      ),
    }}
  />
);

const HEADER_TEXT = i18n.translate('xpack.synthetics.deprecateNoticeModal.headerText', {
  defaultMessage: 'Better way to add monitors',
});

const POLICIES_TEXT = i18n.translate('xpack.synthetics.deprecateNoticeModal.againstPolicies', {
  defaultMessage: 'against your fleet policies',
});

const GO_BACK_TEXT = i18n.translate('xpack.synthetics.deprecateNoticeModal.goBack', {
  defaultMessage: 'Go back',
});

const ADD_PRIVATE_LOCATIONS_TEXT = i18n.translate(
  'xpack.synthetics.deprecateNoticeModal.addPrivateLocations',
  {
    defaultMessage: 'Add private locations',
  }
);

const GO_MONITOR_MANAGEMENT_TEXT = i18n.translate(
  'xpack.synthetics.deprecateNoticeModal.goToMonitorManagement',
  {
    defaultMessage: 'Go to Monitor Management',
  }
);
