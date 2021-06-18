/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiCallOut, EuiLink, EuiButton, EuiSpacer } from '@elastic/eui';

import { useUrlModal } from '../../hooks';

export const MissingFleetServerHostCallout: React.FunctionComponent = () => {
  const { setModal } = useUrlModal();
  return (
    <EuiCallOut
      title={i18n.translate('xpack.fleet.agentEnrollment.missingFleetHostCalloutTitle', {
        defaultMessage: 'Missing URL for Fleet Server host',
      })}
    >
      <FormattedMessage
        id="xpack.fleet.agentEnrollment.missingFleetHostCalloutText"
        defaultMessage="A URL for your Fleet Server host is required to enroll agents with Fleet. You can add this information in Fleet Settings. For more information, see the {link}."
        values={{
          link: (
            <EuiLink
              href="https://www.elastic.co/guide/en/fleet/current/index.html"
              target="_blank"
              external
            >
              <FormattedMessage
                id="xpack.fleet.agentEnrollment.missingFleetHostGuideLink"
                defaultMessage="Fleet User Guide"
              />
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="m" />
      <EuiButton
        fill
        iconType="gear"
        onClick={() => {
          setModal('settings');
        }}
      >
        <FormattedMessage
          id="xpack.fleet.agentEnrollment.fleetSettingsLink"
          defaultMessage="Fleet Settings"
        />
      </EuiButton>
    </EuiCallOut>
  );
};
