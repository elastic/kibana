/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect } from 'react';
import styled from 'styled-components';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiPanel,
  EuiLink,
  EuiText,
  EuiForm,
  EuiRadioGroup,
  EuiSpacer,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSwitch,
} from '@elastic/eui';

import { sendPutSettings, useGetSettings, useStartServices } from '../../../hooks';

export type IntegrationPreferenceType = 'recommended' | 'beats' | 'agent';

interface Option {
  type: IntegrationPreferenceType;
  label: React.ReactNode;
}

export interface Props {
  initialType: IntegrationPreferenceType;
  onChange: (type: IntegrationPreferenceType) => void;
  onPrereleaseEnabledChange: (prerelease: boolean) => void;
}

const recommendedTooltip = (
  <FormattedMessage
    id="xpack.fleet.epm.integrationPreference.recommendedTooltip"
    defaultMessage="We recommend Elastic Agent integrations when they are generally available."
  />
);

const Item = styled(EuiFlexItem)`
  padding-left: ${(props) => props.theme.eui.euiSizeXS};
`;

const EuiSwitchNoWrap = styled(EuiSwitch)`
  white-space: nowrap;
`;

const options: Option[] = [
  {
    type: 'recommended',
    label: (
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          {i18n.translate('xpack.fleet.epm.integrationPreference.recommendedLabel', {
            defaultMessage: 'Recommended',
          })}
        </EuiFlexItem>
        <Item>
          <EuiIconTip content={recommendedTooltip} />
        </Item>
      </EuiFlexGroup>
    ),
  },
  {
    type: 'agent',
    label: i18n.translate('xpack.fleet.epm.integrationPreference.elasticAgentLabel', {
      defaultMessage: 'Elastic Agent only',
    }),
  },
  {
    type: 'beats',
    label: i18n.translate('xpack.fleet.epm.integrationPreference.beatsLabel', {
      defaultMessage: 'Beats only',
    }),
  },
];

export const IntegrationPreference = ({
  initialType,
  onChange,
  onPrereleaseEnabledChange,
}: Props) => {
  const [idSelected, setIdSelected] = React.useState<IntegrationPreferenceType>(initialType);

  const { docLinks } = useStartServices();

  const [prereleaseIntegrationsEnabled, setPrereleaseIntegrationsEnabled] = React.useState<
    boolean | undefined
  >(undefined);

  const { data: settings, error: settingsError } = useGetSettings();

  useEffect(() => {
    const isEnabled = Boolean(settings?.item.prerelease_integrations_enabled);
    if (settings?.item) {
      setPrereleaseIntegrationsEnabled(isEnabled);
    } else if (settingsError) {
      setPrereleaseIntegrationsEnabled(false);
    }
  }, [settings?.item, settingsError]);

  useEffect(() => {
    if (prereleaseIntegrationsEnabled !== undefined) {
      onPrereleaseEnabledChange(prereleaseIntegrationsEnabled);
    }
  }, [onPrereleaseEnabledChange, prereleaseIntegrationsEnabled]);

  const updateSettings = useCallback(async (prerelease: boolean) => {
    const res = await sendPutSettings({
      prerelease_integrations_enabled: prerelease,
    });

    if (res.error) {
      throw res.error;
    }
  }, []);

  const link = (
    <EuiLink href={docLinks.links.fleet.beatsAgentComparison}>
      <FormattedMessage
        id="xpack.fleet.epm.integrationPreference.titleLink"
        defaultMessage="Elastic Agent and Beats"
      />
    </EuiLink>
  );

  const title = (
    <FormattedMessage
      id="xpack.fleet.epm.integrationPreference.title"
      defaultMessage="If an integration is available for {link}, show:"
      values={{ link }}
    />
  );

  const radios = options.map((option) => ({
    id: option.type,
    value: option.type,
    label: option.label,
  }));

  const onPrereleaseSwitchChange = (
    event: React.BaseSyntheticEvent<
      React.MouseEvent<HTMLButtonElement>,
      HTMLButtonElement,
      EventTarget & { checked: boolean }
    >
  ) => {
    const isChecked = event.target.checked;
    setPrereleaseIntegrationsEnabled(isChecked);
    updateSettings(isChecked);
  };

  return (
    <EuiPanel hasShadow={false} paddingSize="none">
      {prereleaseIntegrationsEnabled !== undefined && (
        <EuiSwitchNoWrap
          label="Display beta integrations"
          checked={prereleaseIntegrationsEnabled}
          onChange={onPrereleaseSwitchChange}
        />
      )}
      <EuiSpacer size="l" />
      <EuiText size="s">{title}</EuiText>
      <EuiSpacer size="m" />
      <EuiForm>
        <EuiRadioGroup
          options={radios}
          idSelected={idSelected}
          onChange={(id, value) => {
            setIdSelected(id as IntegrationPreferenceType);
            onChange(value as IntegrationPreferenceType);
          }}
          name="preference"
        />
      </EuiForm>
      <EuiSpacer size="m" />
    </EuiPanel>
  );
};
