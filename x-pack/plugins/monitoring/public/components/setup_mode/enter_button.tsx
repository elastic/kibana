/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import './enter_button.scss';

export interface SetupModeEnterButtonProps {
  enabled: boolean;
  toggleSetupMode: (state: boolean) => void;
}

export const SetupModeEnterButton: React.FC<SetupModeEnterButtonProps> = (
  props: SetupModeEnterButtonProps
) => {
  const [isLoading, setIsLoading] = React.useState(false);

  if (!props.enabled) {
    return null;
  }

  async function enterSetupMode() {
    setIsLoading(true);
    await props.toggleSetupMode(true);
    setIsLoading(false);
  }

  return (
    <div className="monSetupModeEnterButton__buttonWrapper">
      <EuiButton
        onClick={enterSetupMode}
        iconType="flag"
        size="s"
        iconSide="right"
        isLoading={isLoading}
      >
        {i18n.translate('xpack.monitoring.setupMode.enter', {
          defaultMessage: 'Enter setup mode',
        })}
      </EuiButton>
    </div>
  );
};
