/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, PropsOf } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { MissingSetupPrivilegesToolTip } from './missing_setup_privileges_tooltip';

export const CreateJobButton: React.FunctionComponent<
  {
    hasSetupCapabilities?: boolean;
  } & PropsOf<typeof EuiButton>
> = ({ hasSetupCapabilities = true, children, ...buttonProps }) => {
  const button = (
    <EuiButton isDisabled={!hasSetupCapabilities} {...buttonProps}>
      {children ?? (
        <FormattedMessage
          id="xpack.infra.logs.analysis.createJobButtonLabel"
          defaultMessage="Create ML jobs"
        />
      )}
    </EuiButton>
  );

  return hasSetupCapabilities ? (
    button
  ) : (
    <MissingSetupPrivilegesToolTip position="bottom" delay="regular">
      {button}
    </MissingSetupPrivilegesToolTip>
  );
};

export const RecreateJobButton: React.FunctionComponent<PropsOf<typeof CreateJobButton>> = ({
  children,
  ...otherProps
}) => (
  <CreateJobButton {...otherProps}>
    {children ?? (
      <FormattedMessage
        id="xpack.infra.logs.analysis.recreateJobButtonLabel"
        defaultMessage="Recreate ML job"
      />
    )}
  </CreateJobButton>
);
