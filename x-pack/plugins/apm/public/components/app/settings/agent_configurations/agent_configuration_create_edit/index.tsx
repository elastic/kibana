/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { History } from 'history';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  AgentConfiguration,
  AgentConfigurationIntake,
} from '../../../../../../common/agent_configuration/configuration_types';
import { FetcherResult } from '../../../../../hooks/use_fetcher';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import { ServicePage } from './service_page/service_page';
import { SettingsPage } from './settings_page/settings_page';

type PageStep = 'choose-service-step' | 'choose-settings-step' | 'review-step';

function getInitialNewConfig(
  existingConfig: AgentConfigurationIntake | undefined
) {
  return {
    agent_name: existingConfig?.agent_name,
    service: existingConfig?.service || {},
    settings: existingConfig?.settings || {},
  };
}

function setPage(pageStep: PageStep, history: History) {
  history.push({
    ...history.location,
    search: fromQuery({
      ...toQuery(history.location.search),
      pageStep,
    }),
  });
}

function getUnsavedChanges({
  newConfig,
  existingConfig,
}: {
  newConfig: AgentConfigurationIntake;
  existingConfig?: AgentConfigurationIntake;
}) {
  return Object.fromEntries(
    Object.entries(newConfig.settings).filter(([key, value]) => {
      const existingValue = existingConfig?.settings?.[key];

      // don't highlight changes that were added and removed
      if (value === '' && existingValue == null) {
        return false;
      }

      return existingValue !== value;
    })
  );
}

export function AgentConfigurationCreateEdit({
  pageStep,
  existingConfigResult,
}: {
  pageStep: PageStep;
  existingConfigResult?: FetcherResult<AgentConfiguration>;
}) {
  const history = useHistory();
  const existingConfig = existingConfigResult?.data;
  const isEditMode = Boolean(existingConfigResult);
  const [newConfig, setNewConfig] = useState<AgentConfigurationIntake>(
    getInitialNewConfig(existingConfig)
  );

  const resetSettings = useCallback(() => {
    setNewConfig((_newConfig) => ({
      ..._newConfig,
      settings: existingConfig?.settings || {},
    }));
  }, [existingConfig]);

  // update newConfig when existingConfig has loaded
  useEffect(() => {
    setNewConfig(getInitialNewConfig(existingConfig));
  }, [existingConfig]);

  useEffect(() => {
    // the user tried to edit the service of an existing config
    if (pageStep === 'choose-service-step' && isEditMode) {
      setPage('choose-settings-step', history);
    }

    // the user skipped the first step (select service)
    if (
      pageStep === 'choose-settings-step' &&
      !isEditMode &&
      isEmpty(newConfig.service)
    ) {
      setPage('choose-service-step', history);
    }
  }, [history, isEditMode, newConfig, pageStep]);

  const unsavedChanges = getUnsavedChanges({ newConfig, existingConfig });

  return (
    <>
      <EuiText color="subdued">
        {i18n.translate('xpack.apm.agentConfig.newConfig.description', {
          defaultMessage: `Fine-tune your agent configuration from within the APM app. Changes are automatically propagated to your APM agents, so there’s no need to redeploy.`,
        })}
      </EuiText>

      <EuiSpacer size="m" />

      <EuiTitle size="s">
        <h2>
          {isEditMode
            ? i18n.translate('xpack.apm.agentConfig.editConfigTitle', {
                defaultMessage: 'Edit configuration',
              })
            : i18n.translate('xpack.apm.agentConfig.createConfigTitle', {
                defaultMessage: 'Create configuration',
              })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="m" />

      {pageStep === 'choose-service-step' && (
        <ServicePage
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          onClickNext={() => {
            resetSettings();
            setPage('choose-settings-step', history);
          }}
        />
      )}

      {pageStep === 'choose-settings-step' && (
        <SettingsPage
          status={existingConfigResult?.status}
          unsavedChanges={unsavedChanges}
          onClickEdit={() => setPage('choose-service-step', history)}
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          resetSettings={resetSettings}
          isEditMode={isEditMode}
        />
      )}

      {/*
      TODO: Add review step
      {pageStep === 'review-step' && <div>Review will be here </div>}
      */}
    </>
  );
}
