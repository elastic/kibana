/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';

interface Props {
  dataStreams: Array<{ name: string; title: string }>;
}

export const RootPrivilegesCallout: React.FC<Props> = ({ dataStreams }) => {
  return (
    <EuiCallOut
      size="m"
      color="warning"
      title={
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.requireRootCalloutTitle"
          defaultMessage="Requires root privileges"
        />
      }
      data-test-subj="rootPrivilegesCallout"
    >
      {dataStreams.length === 0 ? (
        <FormattedMessage
          id="xpack.fleet.createPackagePolicy.requireRootCalloutDescription"
          defaultMessage="Elastic Agent needs to be run with root/administrator privileges for this integration."
        />
      ) : (
        <>
          <FormattedMessage
            id="xpack.fleet.addIntegration.confirmModal.unprivilegedAgentsDataStreamsMessage"
            defaultMessage="This integration has the following data streams that require Elastic Agents to have root privileges. To ensure that all data required by the integration can be collected, enroll agents using an account with root privileges."
          />
          <ul>
            {dataStreams.map((item) => (
              <li key={item.name}>{item.title}</li>
            ))}
          </ul>
        </>
      )}
    </EuiCallOut>
  );
};
