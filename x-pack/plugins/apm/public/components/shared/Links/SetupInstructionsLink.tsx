/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../hooks/useApmPluginContext';

const SETUP_INSTRUCTIONS_LABEL = i18n.translate(
  'xpack.apm.setupInstructionsButtonLabel',
  {
    defaultMessage: 'Setup Instructions',
  }
);

// renders a filled button or a link as a kibana link to setup instructions
export function SetupInstructionsLink({
  buttonFill = false,
}: {
  buttonFill?: boolean;
}) {
  const { core } = useApmPluginContext();
  return (
    <EuiLink href={core.http.basePath.prepend('/app/home#/tutorial/apm')}>
      {buttonFill ? (
        <EuiButton size="s" color="primary" fill={buttonFill} iconType="help">
          {SETUP_INSTRUCTIONS_LABEL}
        </EuiButton>
      ) : (
        <EuiButtonEmpty size="s" color="primary" iconType="help">
          {SETUP_INSTRUCTIONS_LABEL}
        </EuiButtonEmpty>
      )}
    </EuiLink>
  );
}
