/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { RemoveIndexSettingsProvider } from './remove_settings_provider';

interface Props {
  settings: any;
}

/**
 * Renders a button if the given index contains deprecated index settings
 */
export const FixIndexSettingsButton: React.FunctionComponent<Props> = ({ settings }) => {
  return (
    <RemoveIndexSettingsProvider>
      {(removeIndexSettingsPrompt) => {
        return (
          <EuiButton
            data-test-subj="removeIndexSettingsButton"
            onClick={() => removeIndexSettingsPrompt(settings)}
          >
            <FormattedMessage
              id="xpack.upgradeAssistant.checkupTab.indexSettings.fixButtonLabel"
              defaultMessage="Fix"
            />
          </EuiButton>
        );
      }}
    </RemoveIndexSettingsProvider>
  );
};
