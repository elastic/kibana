/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { RemoveIndexSettingsProvider } from './remove_settings_provider';

const i18nTexts = {
  fixButtonLabel: i18n.translate('xpack.upgradeAssistant.checkupTab.indexSettings.fixButtonLabel', {
    defaultMessage: 'Fix',
  }),
  doneButtonLabel: i18n.translate(
    'xpack.upgradeAssistant.checkupTab.indexSettings.doneButtonLabel',
    {
      defaultMessage: 'Done',
    }
  ),
};

interface Props {
  settings: string[];
  index: string;
}

/**
 * Renders a button if the given index contains deprecated index settings
 */
export const FixIndexSettingsButton: React.FunctionComponent<Props> = ({ settings, index }) => {
  return (
    <RemoveIndexSettingsProvider>
      {(removeIndexSettingsPrompt, successfulRequests) => {
        const isSuccessfulRequest = successfulRequests[index] === true;
        return (
          <EuiButton
            size="s"
            data-test-subj="removeIndexSettingsButton"
            onClick={() => removeIndexSettingsPrompt(index, settings)}
            isDisabled={isSuccessfulRequest}
            iconType={isSuccessfulRequest ? 'check' : undefined}
          >
            {isSuccessfulRequest ? i18nTexts.doneButtonLabel : i18nTexts.fixButtonLabel}
          </EuiButton>
        );
      }}
    </RemoveIndexSettingsProvider>
  );
};
