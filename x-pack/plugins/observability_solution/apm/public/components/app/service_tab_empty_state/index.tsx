/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
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
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import defaultImgSrc from '../../../assets/service_tab_empty_state/service_tab_empty_state_default.png';

export interface ServiceTabEmptyStateProps {
  title: string;
  content: string;
  imgSrc: string | null;
  dismissable?: boolean;
  onDissmiss?: () => void;
}

const addAPMLinkButton = {
  label: i18n.translate('xpack.apm.serviceTabEmptyState.addAPMButtonLabel', {
    defaultMessage: 'Add APM',
  }),
  href: '/app/observabilityOnboarding/?category=apm',
};

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

export function ServiceTabEmptyState({
  title,
  content,
  imgSrc,
  dismissable,
  onDissmiss,
}: ServiceTabEmptyStateProps) {
  const { core } = useApmPluginContext();
  const { basePath } = core.http;
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <EuiPanel color="subdued" paddingSize="xl" style={{ position: 'relative' }}>
        <EuiFlexGroup alignItems="center">
          <EuiFlexItem>
            <EuiTitle size="s">
              <h3>{title}</h3>
            </EuiTitle>
            <EuiSpacer size="s" />
            <EuiText size="s">{content}</EuiText>
            <EuiSpacer size="m" />
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="ServiceTabEmptyStateAddApmButton"
                  href={basePath.prepend(addAPMLinkButton.href)}
                  fill
                >
                  {addAPMLinkButton.label}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="ServiceTabEmptyStateTryItNowButton"
                  iconType="launch"
                  iconSide="right"
                  href={tryItNowButton.href}
                  target="_blank"
                >
                  {tryItNowButton.label}
                </EuiButton>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiLink
                  href={learnMoreLink.href}
                  target="_blank"
                  data-test-subj="infraHostsTableWithoutSystemMetricsPopoverTroubleshootingLink"
                  external
                >
                  {learnMoreLink.label}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!imgSrc && (
            <EuiFlexItem
              style={{
                maxHeight: `${euiTheme.base * 14}px`,
                overflow: 'hidden',
                borderRadius: `${euiTheme.border.radius.medium}`,
                border: `${euiTheme.border.thin}`,
              }}
            >
              <EuiImage src={defaultImgSrc} alt={content} />
            </EuiFlexItem>
          )}

          {dismissable && (
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
      {imgSrc && (
        <>
          <EuiSpacer size="l" />
          <EuiImage src={imgSrc} alt={content} size="fullWidth" style={{ opacity: 0.2 }} />
        </>
      )}
    </>
  );
}
