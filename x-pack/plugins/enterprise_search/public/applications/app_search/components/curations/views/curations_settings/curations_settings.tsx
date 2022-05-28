/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import {
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { FormattedMessage } from '@kbn/i18n-react';

import { docLinks } from '../../../../../shared/doc_links';
import { LicensingLogic } from '../../../../../shared/licensing';
import { Loading } from '../../../../../shared/loading';
import { EuiButtonTo } from '../../../../../shared/react_router_helpers';
import { SETTINGS_PATH } from '../../../../routes';
import { DataPanel } from '../../../data_panel';
import { LogRetentionLogic, LogRetentionOptions } from '../../../log_retention';

import { AutomatedIcon } from '../../components/automated_icon';

import { CurationsSettingsLogic } from './curations_settings_logic';

export const CurationsSettings: React.FC = () => {
  const { hasPlatinumLicense } = useValues(LicensingLogic);

  const {
    curationsSettings: { enabled, mode },
    dataLoading,
  } = useValues(CurationsSettingsLogic);
  const {
    loadCurationsSettings,
    onSkipLoadingCurationsSettings,
    toggleCurationsEnabled,
    toggleCurationsMode,
  } = useActions(CurationsSettingsLogic);

  const { isLogRetentionUpdating, logRetention } = useValues(LogRetentionLogic);
  const { fetchLogRetention } = useActions(LogRetentionLogic);

  const analyticsDisabled = !logRetention?.[LogRetentionOptions.Analytics].enabled;

  useEffect(() => {
    if (hasPlatinumLicense) {
      fetchLogRetention();
    }
  }, [hasPlatinumLicense]);

  useEffect(() => {
    if (logRetention) {
      if (!analyticsDisabled) {
        loadCurationsSettings();
      } else {
        onSkipLoadingCurationsSettings();
      }
    }
  }, [logRetention]);

  if (!hasPlatinumLicense)
    return (
      <DataPanel
        title={
          <h2>
            {i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.settings.licenseUpgradeCTATitle',
              {
                defaultMessage: 'Introducing curations powered by adaptive relevance',
              }
            )}
          </h2>
        }
        subtitle={
          <FormattedMessage
            id="xpack.enterpriseSearch.appSearch.curations.settings.licenseUpgradeCTASubtitle"
            defaultMessage="Upgrade to a {platinumLicenseName} subscription to harness the power of machine learning. By analyzing your engine's analytics, App Search is able to suggest new or updated curations. Effortlessly help your users find exactly what they're looking for. Start a free trial today."
            values={{
              platinumLicenseName: (
                <strong>
                  {i18n.translate('xpack.enterpriseSearch.appSearch.curations.settings.platinum', {
                    defaultMessage: 'Platinum',
                  })}
                </strong>
              ),
            }}
          />
        }
        action={
          <EuiButtonTo to="/app/management/stack/license_management" shouldNotCreateHref>
            {i18n.translate(
              'xpack.enterpriseSearch.curations.settings.start30DayTrialButtonLabel',
              {
                defaultMessage: 'Start a 30-day trial',
              }
            )}
          </EuiButtonTo>
        }
      >
        <EuiButtonEmpty target="_blank" iconType="popout" href={docLinks.licenseManagement}>
          {i18n.translate('xpack.enterpriseSearch.curations.settings.licenseUpgradeLink', {
            defaultMessage: 'Learn more about license upgrades',
          })}
        </EuiButtonEmpty>
      </DataPanel>
    );
  if (dataLoading || isLogRetentionUpdating) return <Loading />;

  return (
    <>
      <EuiFlexGroup gutterSize="xs" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiIcon type={AutomatedIcon} size="l" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>
              {i18n.translate(
                'xpack.enterpriseSearch.appSearch.curations.settings.automaticCurationsTitle',
                {
                  defaultMessage: 'Curations powered by adaptive relevance',
                }
              )}
            </h2>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
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
                    'Adaptive relevance requires analytics to be enabled on your account.',
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
          <EuiSpacer size="m" />
        </>
      )}
      <EuiText color="subdued" size="s">
        {i18n.translate(
          'xpack.enterpriseSearch.appSearch.curations.settings.automaticCurationsDescription',
          {
            defaultMessage:
              "App Search will monitor your engine's analytics and suggest changes to your curations to help you deliver the most relevant results. Each suggestion can be accepted, rejected, or modified.",
          }
        )}
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.settings.enableautomaticCurationsSwitchLabel',
              {
                defaultMessage: 'Enable suggestions',
              }
            )}
            checked={enabled}
            disabled={analyticsDisabled}
            onChange={toggleCurationsEnabled}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiSwitch
            label={i18n.translate(
              'xpack.enterpriseSearch.appSearch.curations.settings.acceptNewSuggesstionsSwitchLabel',
              {
                defaultMessage: 'Automatically accept new suggestions',
              }
            )}
            checked={mode === 'automatic'}
            disabled={analyticsDisabled}
            onChange={toggleCurationsMode}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
