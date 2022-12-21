/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { RulesConfigurationModal } from './rules_configuration_modal';
import { useKibana } from '../../../common/lib/kibana';

export const RulesConfigurationLink = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const {
    application: { capabilities },
  } = useKibana().services;

  return (
    <>
      <EuiButtonEmpty
        onClick={() => setIsVisible(true)}
        iconType="gear"
        data-test-subj="rulesConfigurationLink"
        disabled={!capabilities.rules_configuration.show}
      >
        <FormattedMessage
          id="xpack.triggersActionsUI.rulesConfiguration.link.title"
          defaultMessage="Settings"
        />
      </EuiButtonEmpty>
      <RulesConfigurationModal isVisible={isVisible} onClose={() => setIsVisible(false)} />
    </>
  );
};
