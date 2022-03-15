/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import { getAgentAuthorizationSettings } from './settings_definition/agent_authorization_settings';
import { getApmSettings } from './settings_definition/apm_settings';
import {
  getRUMSettings,
  isRUMFormValid,
} from './settings_definition/rum_settings';
import {
  TAIL_SAMPLING_ENABLED_KEY,
  getTailSamplingSettings,
  isTailBasedSamplingValid,
} from './settings_definition/tail_sampling_settings';
import {
  getTLSSettings,
  isTLSFormValid,
} from './settings_definition/tls_settings';
import { SettingsForm, SettingsSection } from './settings_form';
import { isSettingsFormValid, mergeNewVars } from './settings_form/utils';
import { PackagePolicyVars } from './typings';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';

interface Props {
  updateAPMPolicy: (newVars: PackagePolicyVars, isValid: boolean) => void;
  vars?: PackagePolicyVars;
  isCloudPolicy: boolean;
}

export function APMPolicyForm({
  vars = {},
  isCloudPolicy,
  updateAPMPolicy,
}: Props) {
  const tailSamplingPoliciesDocsLink =
    useKibana().services.docLinks?.links.apm.tailSamplingPolicies;
  const {
    apmSettings,
    rumSettings,
    tlsSettings,
    agentAuthorizationSettings,
    tailSamplingSettings,
  } = useMemo(() => {
    return {
      apmSettings: getApmSettings({ isCloudPolicy }),
      rumSettings: getRUMSettings(),
      tlsSettings: getTLSSettings(),
      agentAuthorizationSettings: getAgentAuthorizationSettings({
        isCloudPolicy,
      }),
      tailSamplingSettings: getTailSamplingSettings(
        tailSamplingPoliciesDocsLink
      ),
    };
  }, [isCloudPolicy, tailSamplingPoliciesDocsLink]);

  function handleFormChange(key: string, value: any) {
    // Merge new key/value with the rest of fields
    const newVars = mergeNewVars(vars, key, value);

    // Validate the entire form before sending it to fleet
    const isFormValid =
      isSettingsFormValid(apmSettings, newVars) &&
      isRUMFormValid(newVars, rumSettings) &&
      isTLSFormValid(newVars, tlsSettings) &&
      isSettingsFormValid(agentAuthorizationSettings, newVars) &&
      isTailBasedSamplingValid(newVars, tailSamplingSettings);

    updateAPMPolicy(newVars, isFormValid);
  }

  const settingsSections: SettingsSection[] = [
    {
      id: 'apm',
      title: i18n.translate(
        'xpack.apm.fleet_integration.settings.apm.settings.title',
        { defaultMessage: 'General' }
      ),
      subtitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.apm.settings.subtitle',
        { defaultMessage: 'Settings for the APM integration.' }
      ),
      settings: apmSettings,
    },
    {
      id: 'rum',
      title: i18n.translate(
        'xpack.apm.fleet_integration.settings.rum.settings.title',
        { defaultMessage: 'Real User Monitoring' }
      ),
      subtitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.rum.settings.subtitle',
        { defaultMessage: 'Manage the configuration of the RUM JS agent.' }
      ),
      settings: rumSettings,
    },
    {
      id: 'tls',
      title: i18n.translate(
        'xpack.apm.fleet_integration.settings.tls.settings.title',
        { defaultMessage: 'TLS Settings' }
      ),
      subtitle: i18n.translate(
        'xpack.apm.fleet_integration.settings.tls.settings.subtitle',
        { defaultMessage: 'Settings for TLS certification.' }
      ),
      settings: tlsSettings,
    },
    {
      id: 'agentAuthorization',
      title: i18n.translate(
        'xpack.apm.fleet_integration.settings.agentAuthorization.settings.title',
        { defaultMessage: 'Agent authorization' }
      ),
      settings: agentAuthorizationSettings,
    },
    ...(vars[TAIL_SAMPLING_ENABLED_KEY]
      ? [
          {
            id: 'tailSampling',
            title: i18n.translate(
              'xpack.apm.fleet_integration.settings.tailSampling.settings.title',
              { defaultMessage: 'Tail-based sampling' }
            ),
            subtitle: i18n.translate(
              'xpack.apm.fleet_integration.settings.tailSampling.settings.subtitle',
              {
                defaultMessage:
                  'Manage tail-based sampling for services and traces.',
              }
            ),
            settings: tailSamplingSettings,
            isBeta: false,
            isPlatinumLicence: true,
          },
        ]
      : []),
  ];

  return (
    <>
      {settingsSections.map((settingsSection) => {
        return (
          <React.Fragment key={settingsSection.id}>
            <SettingsForm
              settingsSection={settingsSection}
              vars={vars}
              onChange={handleFormChange}
            />
            <EuiSpacer />
          </React.Fragment>
        );
      })}
    </>
  );
}
