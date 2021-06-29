/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonEmpty, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

const SETUP_INSTRUCTIONS_LABEL = i18n.translate(
  'xpack.apm.setupInstructionsButtonLabel',
  {
    defaultMessage: 'Setup instructions',
  }
);

const ADD_DATA_LABEL = i18n.translate('xpack.apm.addDataButtonLabel', {
  defaultMessage: 'Add data',
});

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
        <EuiButtonEmpty size="s" color="primary" iconType="indexOpen">
          {ADD_DATA_LABEL}
        </EuiButtonEmpty>
      )}
    </EuiLink>
  );
}
