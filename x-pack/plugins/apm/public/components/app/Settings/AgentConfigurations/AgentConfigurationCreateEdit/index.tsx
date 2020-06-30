/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEmpty } from 'lodash';
import { EuiTitle, EuiText, EuiSpacer } from '@elastic/eui';
import React, { useState, useEffect, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { FetcherResult } from '../../../../../hooks/useFetcher';
import { history } from '../../../../../utils/history';
import {
  AgentConfigurationIntake,
  AgentConfiguration,
} from '../../../../../../common/agent_configuration/configuration_types';
import { ServicePage } from './ServicePage/ServicePage';
import { SettingsPage } from './SettingsPage/SettingsPage';
import { fromQuery, toQuery } from '../../../../shared/Links/url_helpers';

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

function setPage(pageStep: PageStep) {
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
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [existingConfig]);

  // update newConfig when existingConfig has loaded
  useEffect(() => {
    setNewConfig(getInitialNewConfig(existingConfig));
  }, [existingConfig]);

  useEffect(() => {
    // the user tried to edit the service of an existing config
    if (pageStep === 'choose-service-step' && isEditMode) {
      setPage('choose-settings-step');
    }

    // the user skipped the first step (select service)
    if (
      pageStep === 'choose-settings-step' &&
      !isEditMode &&
      isEmpty(newConfig.service)
    ) {
      setPage('choose-service-step');
    }
  }, [isEditMode, newConfig, pageStep]);

  const unsavedChanges = getUnsavedChanges({ newConfig, existingConfig });

  return (
    <>
      <EuiTitle>
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

      <EuiText size="s">
        {i18n.translate('xpack.apm.agentConfig.newConfig.description', {
          defaultMessage: `This allows you to fine-tune your agent configuration directly in
        Kibana. Best of all, changes are automatically propagated to your APM
        agents so there’s no need to redeploy.`,
        })}
      </EuiText>

      <EuiSpacer size="m" />

      {pageStep === 'choose-service-step' && (
        <ServicePage
          newConfig={newConfig}
          setNewConfig={setNewConfig}
          onClickNext={() => {
            resetSettings();
            setPage('choose-settings-step');
          }}
        />
      )}

      {pageStep === 'choose-settings-step' && (
        <SettingsPage
          status={existingConfigResult?.status}
          unsavedChanges={unsavedChanges}
          onClickEdit={() => setPage('choose-service-step')}
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
