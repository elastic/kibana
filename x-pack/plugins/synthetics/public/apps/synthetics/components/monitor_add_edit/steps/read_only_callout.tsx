/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const ReadOnlyCallout = ({
  projectId,
  canUsePublicLocations,
}: {
  projectId?: string;
  canUsePublicLocations?: boolean;
}) => {
  if (projectId) {
    return (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.synthetics.project.readOnly.callout.title"
              defaultMessage="This configuration is read-only"
            />
          }
          iconType="document"
        >
          <p>
            <FormattedMessage
              id="xpack.synthetics.project.readOnly.callout.content"
              defaultMessage="This monitor was added from an external project: {projectId}. From this page, you can only enable and disable the monitor and its alerts, or remove it. To make configuration changes, you have to edit its source file and push it again from that project."
              values={{ projectId: <strong>{projectId}</strong> }}
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  if (!canUsePublicLocations) {
    return (
      <>
        <EuiCallOut
          color="warning"
          title={
            <FormattedMessage
              id="xpack.synthetics.publicLocations.readOnly.callout.title"
              defaultMessage="You do not have permission to use Elastic managed locations"
            />
          }
          iconType="alert"
        >
          <p>
            <FormattedMessage
              id="xpack.synthetics.publicLocations.readOnly.callout.content"
              defaultMessage="This monitor contains a Elastic managed location. To edit this monitor, you need to have permission to use Elastic managed locations."
            />
          </p>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  }

  return null;
};
