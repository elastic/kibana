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
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { useKibanaUrl } from '../../../hooks/use_kibana_url';
import { AddApmData } from '../../shared/add_data_buttons/buttons';

export interface ServiceTabEmptyStateProps {
  title: string;
  content: string;
  imgName?: string;
  dismissable?: boolean;
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

export function ServiceTabEmptyState({
  title,
  content,
  imgName,
  onDissmiss,
}: ServiceTabEmptyStateProps) {
  const { euiTheme } = useEuiTheme();
  const imgFolder = `/plugins/apm/assets/service_tab_empty_state/${
    useUiSetting('theme:darkMode') === 'enabled' ? 'dark' : 'light'
  }`;
  const imgSrc = useKibanaUrl(
    `${imgFolder}/${imgName ? imgName : 'service_tab_empty_state_overview.png'}`
  );

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
                <AddApmData
                  data-test-subj="ServiceTabEmptyStateAddApmButton"
                  size="m"
                  fill={true}
                />
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
                  data-test-subj="ServiceTabEmptyStateLearnMoreButton"
                  external
                >
                  {learnMoreLink.label}
                </EuiLink>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          {!imgName && (
            <EuiFlexItem
              style={{
                maxHeight: `${euiTheme.base * 14}px`,
                overflow: 'hidden',
                borderRadius: `${euiTheme.border.radius.medium}`,
                border: `${euiTheme.border.thin}`,
              }}
            >
              <EuiImage src={imgSrc} alt={content} />
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
      {imgName && (
        <>
          <EuiSpacer size="l" />
          <EuiImage src={imgSrc} alt={content} size="fullWidth" style={{ opacity: 0.4 }} />
        </>
      )}
    </>
  );
}
