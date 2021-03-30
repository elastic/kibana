/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import { EuiLoadingSpinner, EuiSwitch } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { useAppContext } from '../../app_context';
import { ResponseError } from '../../lib/api';

export const DeprecationLoggingToggle: React.FunctionComponent = () => {
  const { api } = useAppContext();

  const [isEnabled, setIsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ResponseError | undefined>(undefined);

  useEffect(() => {
    async function getDeprecationLoggingStatus() {
      setIsLoading(true);

      const { data, error: responseError } = await api.getDeprecationLogging();

      setIsLoading(false);

      if (responseError) {
        setError(responseError);
      } else if (data) {
        setIsEnabled(data.isEnabled);
      }
    }

    getDeprecationLoggingStatus();
  }, [api]);

  if (isLoading) {
    return <EuiLoadingSpinner size="l" />;
  }

  const renderLoggingState = () => {
    if (error) {
      return i18n.translate(
        'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.errorLabel',
        {
          defaultMessage: 'Could not load logging state',
        }
      );
    } else if (isEnabled) {
      return i18n.translate(
        'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.enabledLabel',
        {
          defaultMessage: 'On',
        }
      );
    } else {
      return i18n.translate(
        'xpack.upgradeAssistant.overviewTab.steps.deprecationLogsStep.enableDeprecationLoggingToggleSwitch.disabledLabel',
        {
          defaultMessage: 'Off',
        }
      );
    }
  };

  const toggleLogging = async () => {
    const newIsEnabledValue = !isEnabled;

    setIsLoading(true);

    const { data, error: updateError } = await api.updateDeprecationLogging({
      isEnabled: newIsEnabledValue,
    });

    setIsLoading(false);

    if (updateError) {
      setError(updateError);
    } else if (data) {
      setIsEnabled(data.isEnabled);
    }
  };

  return (
    <EuiSwitch
      data-test-subj="upgradeAssistantDeprecationToggle"
      label={renderLoggingState()}
      checked={isEnabled}
      onChange={toggleLogging}
      disabled={isLoading || Boolean(error)}
    />
  );
};
