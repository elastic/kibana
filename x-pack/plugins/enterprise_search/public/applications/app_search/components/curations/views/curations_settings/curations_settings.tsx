/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { EuiButtonEmpty, EuiCallOut, EuiSpacer, EuiSwitch, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n/react';

import { docLinks } from '../../../../../shared/doc_links';
import { LicensingLogic } from '../../../../../shared/licensing';
import { Loading } from '../../../../../shared/loading';
import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { SETTINGS_PATH } from '../../../../routes';
import { DataPanel } from '../../../data_panel';
import { LogRetentionLogic, LogRetentionOptions } from '../../../log_retention';

import { CurationsSettingsLogic } from './curations_settings_logic';

export const CurationsSettings: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const {
    curationsSettings: { enabled, mode },
    dataLoading,
  } = useValues(CurationsSettingsLogic);
  const { loadCurationsSettings, toggleCurationsEnabled, toggleCurationsMode } =
    useActions(CurationsSettingsLogic);

  const { isLogRetentionUpdating, logRetention } = useValues(LogRetentionLogic);
  const { fetchLogRetention } = useActions(LogRetentionLogic);

  const analyticsDisabled = !logRetention?.[LogRetentionOptions.Analytics].enabled;

  useEffect(() => {
    loadCurationsSettings();
    fetchLogRetention();
  }, []);

  if (!hasPlatinumLicense)
    return (
      <DataPanel
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.settings.licenseUpgradeCTATitle',
              {
                defaultMessage: 'Introducing Automated Curations',
              }
            )}
          </h2>
        }
        subtitle={
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.curations.settings.licenseUpgradeCTASubtitle"
            defaultMessage="Upgrade to a {platinumLicenseName} license to harness the power of machine learning. By analyzing your engine's analytics, App Seearch is able to suggest new or updated curations. Effortlessly help your users find exactly what they're looking for. Start a free trial today."
            values={{
              platinumLicenseName: <strong>Platinum</strong>,
            }}
          />
        }
        action={
          <EuiButtonTo to="/app/management/stack/license_management" shouldNotCreateHref>
            {i18n.translate('xpack.enterpriseSearch.start30DayTrialButtonLabel', {
              defaultMessage: 'Start a 30-day trial',
            })}
          </EuiButtonTo>
        }
      >
        <EuiButtonEmpty
          target="_blank"
          iconType="popout"
          href={`${docLinks.enterpriseSearchBase}/license-management.html`}
        >
          {i18n.translate('xpack.enterpriseSearch.licenseUpgradeLink', {
            defaultMessage: 'Learn more about license upgrades',
          })}
        </EuiButtonEmpty>
      </DataPanel>
    );
  if (dataLoading || isLogRetentionUpdating) return <Loading />;

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
      <EuiSpacer />
      {analyticsDisabled && (
        <>
          <EuiCallOut
            iconType="iInCircle"
            title={i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.settings.analyticsDisabledCalloutTitle',
              {
                defaultMessage: 'Analytics are disabled',
              }
            )}
          >
            <p>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.curations.settings.analyticsDisabledCalloutDescription',
                {
                  defaultMessage:
                    'Automated curations require analytics to be enabled on your account.',
                }
              )}
            </p>
            <EuiButtonTo fill size="s" to={SETTINGS_PATH}>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.curations.settings.manageAnalyticsButtonLabel',
                { defaultMessage: 'Manage analytics' }
              )}
            </EuiButtonTo>
          </EuiCallOut>
          <EuiSpacer />
        </>
      )}
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
        disabled={analyticsDisabled}
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
        disabled={analyticsDisabled}
        onChange={toggleCurationsMode}
      />
    </>
  );
};
