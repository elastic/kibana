/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { DashboardLink } from './gen_ai/dashboard_link';

export const ReadOnlyConnectorMessage: React.FC<{
  actionTypeId: string;
  connectorId: string;
  connectorName: string;
  href: string;
}> = ({ actionTypeId, connectorId, connectorName, href }) => {
  return (
    <>
      <EuiText>
        {i18n.translate('xpack.triggersActionsUI.sections.editConnectorForm.descriptionText', {
          defaultMessage: 'This connector is readonly.',
        })}
      </EuiText>
      <EuiLink href={href} target="_blank">
        <FormattedMessage
          id="xpack.triggersActionsUI.sections.editConnectorForm.preconfiguredHelpLabel"
          defaultMessage="Learn more about preconfigured connectors."
        />
      </EuiLink>
      {actionTypeId === '.gen-ai' && (
        <>
          <EuiSpacer size="m" />
          <DashboardLink connectorId={connectorId} connectorName={connectorName} />
        </>
      )}
    </>
  );
};
