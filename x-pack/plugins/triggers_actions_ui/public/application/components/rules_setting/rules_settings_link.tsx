/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RulesSettingsModal } from './rules_settings_modal';
import { useKibana } from '../../../common/lib/kibana';

export const RulesSettingsLink = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const {
    application: { capabilities },
  } = useKibana().services;

  const { show, readFlappingSettingsUI } = capabilities.rulesSettings;

  if (!show || !readFlappingSettingsUI) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        onClick={() => setIsVisible(true)}
        iconType="gear"
        data-test-subj="rulesSettingsLink"
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesSettings.link.title"
          defaultMessage="Settings"
        />
      </EuiButtonEmpty>
      <RulesSettingsModal isVisible={isVisible} onClose={() => setIsVisible(false)} />
    </>
  );
};
