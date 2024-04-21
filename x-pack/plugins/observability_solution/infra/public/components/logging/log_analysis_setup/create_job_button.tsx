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

export const CreateJobButton = ({
  hasSetupCapabilities = true,
  children,
  ...buttonProps
}: {
  hasSetupCapabilities?: boolean;
} & PropsOf<typeof EuiButton>) => {
  const button = (
    <EuiButton
      data-test-subj="infraCreateJobButtonButton"
      isDisabled={!hasSetupCapabilities}
      {...buttonProps}
    >
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

export const RecreateJobButton = ({ children, ...otherProps }: PropsOf<typeof CreateJobButton>) => (
  <CreateJobButton {...otherProps}>
    {children ?? (
      <FormattedMessage
        id="xpack.infra.logs.analysis.recreateJobButtonLabel"
        defaultMessage="Recreate ML job"
      />
    )}
  </CreateJobButton>
);
