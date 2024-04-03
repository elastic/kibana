/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { NotFoundPrompt } from '@kbn/shared-ux-prompt-not-found';
import { EuiButtonEmpty } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useParams } from 'react-router-dom';
import { CreateMonitorButton } from '../monitors_page/create_monitor_button';
import { PLUGIN } from '../../../../../common/constants/plugin';
import { ClientPluginsStart } from '../../../../plugin';

export const MonitorNotFoundPage: React.FC = () => {
  const { application } = useKibana<ClientPluginsStart>().services;
  const { monitorId } = useParams<{ monitorId: string }>();

  return (
    <NotFoundPrompt
      title={NOT_FOUND_TITLE}
      body={
        <FormattedMessage
          id="xpack.synthetics.prompt.errors.notFound.body"
          defaultMessage="Sorry, the monitor with id {monitorId} can't be found. It might have been removed or you don't have permissions to view it."
          values={{ monitorId: <strong>{monitorId}</strong> }}
        />
      }
      actions={[
        <CreateMonitorButton />,
        <EuiButtonEmpty
          data-test-subj="syntheticsMonitorNotFoundPageGoToHomeButton"
          iconType="arrowLeft"
          flush="both"
          onClick={() => {
            application.navigateToApp(PLUGIN.SYNTHETICS_PLUGIN_ID);
          }}
        >
          {i18n.translate('xpack.synthetics.routes.createNewMonitor', {
            defaultMessage: 'Go to Home',
          })}
        </EuiButtonEmpty>,
      ]}
    />
  );
};

const NOT_FOUND_TITLE = i18n.translate('xpack.synthetics.prompt.errors.notFound.title', {
  defaultMessage: 'Monitor not found',
});
