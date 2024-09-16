/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @elastic/eui/href-or-on-click */

import {
  EuiButton,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiImage,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { EmptyStateClickParams, EntityInventoryAddDataParams } from '../../../services/telemetry';
import { ApmPluginStartDeps, ApmServices } from '../../../plugin';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { AddApmData } from '../../shared/add_data_buttons/buttons';
import { emptyStateDefinitions, EmptyStateKey } from './constants';

export interface ServiceTabEmptyStateProps {
  id: EmptyStateKey;
  onDissmiss?: () => void;
}

const tryItNowButton = {
  label: i18n.translate('xpack.apm.serviceTabEmptyState.tryItNowButtonLabel', {
    defaultMessage: 'Try it now in our demo cluster',
  }),
  href: 'https://ela.st/demo-apm-try-it',
};

const learnMoreLink = {
  label: i18n.translate('xpack.apm.serviceTabEmptyState.learnMoreLinkLabel', {
    defaultMessage: 'Learn more',
  }),
  href: 'https://www.elastic.co/observability/application-performance-monitoring',
};

const baseImgFolder = '/plugins/apm/assets/service_tab_empty_state';
const defaultAddDataTelemetryParqams: EntityInventoryAddDataParams = {
  view: 'add_apm_cta',
};

const defaultClickTelemetryParams: EmptyStateClickParams = {
  view: 'add_apm_cta',
};

export function ServiceTabEmptyState({ id, onDissmiss }: ServiceTabEmptyStateProps) {
  const { euiTheme } = useEuiTheme();
  const { services } = useKibana<ApmPluginStartDeps & ApmServices>();
  const { core } = useApmPluginContext();

  const imgFolder = `${baseImgFolder}/${
    core.uiSettings.get('theme:darkMode') === 'enabled' ? 'dark' : 'light'
  }`;
  const imgName = emptyStateDefinitions[id].imgName;
  const imgSrc = useKibanaUrl(
    `${imgFolder}/${imgName ? imgName : 'service_tab_empty_state_overview.png'}`
  );

  function handleAddAPMClick() {
    services.telemetry.reportEntityInventoryAddData(defaultAddDataTelemetryParqams);
  }

  function handleTryItClick() {
    services.telemetry.reportTryItClick(defaultClickTelemetryParams);
  }

  function handleLearnMoreClick() {
    services.telemetry.reportLearnMoreClick(defaultClickTelemetryParams);
  }

  return (
    <>
      <EuiPanel color="subdued" paddingSize="xl" style={{ position: 'relative' }}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{emptyStateDefinitions[id].title}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{emptyStateDefinitions[id].content}</EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <AddApmData
                  data-test-subj="ServiceTabEmptyStateAddApmButton"
                  size="m"
                  fill
                  onClick={handleAddAPMClick}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="ServiceTabEmptyStateTryItNowButton"
                  iconType="launch"
                  iconSide="right"
                  href={tryItNowButton.href}
                  onClick={handleTryItClick}
                  target="_blank"
                >
                  {tryItNowButton.label}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  href={learnMoreLink.href}
                  onClick={handleLearnMoreClick}
                  target="_blank"
                  data-test-subj="ServiceTabEmptyStateLearnMoreButton"
                  external
                >
                  {learnMoreLink.label}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!emptyStateDefinitions[id].imgName && (
            <EuiFlexItem
              style={{
                maxHeight: `${euiTheme.base * 16}px`,
                overflow: 'hidden',
                borderRadius: `${euiTheme.border.radius.medium}`,
                border: `${euiTheme.border.thin}`,
              }}
            >
              <EuiImage src={imgSrc} alt={emptyStateDefinitions[id].content} />
            </EuiFlexItem>
          )}

          {onDissmiss && (
            <EuiButtonIcon
              style={{
                position: 'absolute',
                top: `${euiTheme.size.s}`,
                right: `${euiTheme.size.s}`,
              }}
              data-test-subj="ServiceTabEmptyStateDismissButton"
              iconType="cross"
              onClick={onDissmiss}
            />
          )}
        </EuiFlexGroup>
      </EuiPanel>
      {emptyStateDefinitions[id].imgName && (
        <>
          <EuiSpacer size="l" />
          <EuiImage
            src={imgSrc}
            alt={emptyStateDefinitions[id].content}
            size="fullWidth"
            style={{ opacity: 0.4 }}
          />
        </>
      )}
    </>
  );
}
