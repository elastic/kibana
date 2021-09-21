/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiSwitch, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CurationsSettingsLogic } from './curations_settings_logic';

export const CurationsSettings: React.FC = () => {
  const {
    curationsSettings: { enabled, mode },
    dataLoading,
  } = useValues(CurationsSettingsLogic);
  const { loadCurationsSettings, toggleCurationsEnabled, toggleCurationsMode } = useActions(
    CurationsSettingsLogic
  );

  useEffect(() => {
    loadCurationsSettings();
  }, []);

  return (
    <>
      <EuiTitle size="s">
        <h2>
          {i18n.translate(
            'xpack.enterpriseSearch.appSearch.curations.settings.automatedCurationsTitle',
            {
              defaultMessage: 'Curations',
            }
          )}
        </h2>
      </EuiTitle>
      <EuiText>
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.curations.settings.automatedCurationsDescription',
          {
            defaultMessage:
              "Suggesssted curations will monitor your engine's analytics and make automatic suggestions to help you deliver the most relevant results. Each suggested curation can be accepted, rejected, or modified.",
          }
        )}
      </EuiText>
      <EuiSwitch
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.curations.settings.enableAutomatedCurationsSwitchLabel',
          {
            defaultMessage: 'Enable automation suggestions',
          }
        )}
        checked={enabled}
        disabled={dataLoading}
        onChange={toggleCurationsEnabled}
      />
      <EuiSwitch
        label={i18n.translate(
          'xpack.enterpriseSearch.appSearch.curations.settings.acceptNewSuggesstionsSwitchLabel',
          {
            defaultMessage: 'Automatically accept new suggestions',
          }
        )}
        checked={mode === 'automated'}
        disabled={dataLoading}
        onChange={toggleCurationsMode}
      />
    </>
  );
};
