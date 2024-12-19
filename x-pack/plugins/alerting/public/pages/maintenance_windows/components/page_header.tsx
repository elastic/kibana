/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import {
  EuiBetaBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
  useEuiFontSize,
} from '@elastic/eui';
import { css } from '@emotion/react';

import { LinkIcon } from './link_icon';
import * as i18n from '../translations';
import { TruncatedText } from './truncated_text';
import { useMaintenanceWindowsNavigation } from '../../../hooks/use_navigation';

export const ExperimentalBadge = React.memo(() => (
  <EuiBetaBadge
    label={i18n.EXPERIMENTAL_LABEL}
    tooltipContent={i18n.EXPERIMENTAL_DESCRIPTION}
    tooltipPosition="bottom"
  />
));
ExperimentalBadge.displayName = 'ExperimentalBadge';

interface TitleProps {
  title: string;
  description?: string;
}
const Title = React.memo<TitleProps>(({ title, description }) => {
  return (
    <EuiFlexGroup direction="column" alignItems="baseline" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="baseline" gutterSize="m" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h1>{<TruncatedText text={title} />}</h1>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <ExperimentalBadge />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {description ? (
        <>
          <EuiSpacer size="xs" />
          <EuiFlexItem data-test-subj="description">
            <TruncatedText text={description} />
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  );
});
Title.displayName = 'Title';

export interface PageHeaderProps {
  title: string;
  showBackButton?: boolean;
  description?: string;
}

export const PageHeader = React.memo<PageHeaderProps>(
  ({ showBackButton = false, title, description }) => {
    const { euiTheme } = useEuiTheme();
    const xsFontSize = useEuiFontSize('xs').fontSize;
    const lineHeight = useEuiFontSize('xs').lineHeight;
    const { navigateToMaintenanceWindows } = useMaintenanceWindowsNavigation();

    const navigateToMaintenanceWindowsClick = useCallback(() => {
      navigateToMaintenanceWindows();
    }, [navigateToMaintenanceWindows]);

    return (
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          {showBackButton && (
            <div
              data-test-subj="link-back"
              css={css`
                font-size: ${xsFontSize};
                line-height: ${lineHeight};
                margin-bottom: ${euiTheme.size.s};
              `}
            >
              <LinkIcon onClick={navigateToMaintenanceWindowsClick} iconType="arrowLeft">
                {i18n.MAINTENANCE_WINDOWS_RETURN_LINK}
              </LinkIcon>
            </div>
          )}
          <Title title={title} description={description} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
PageHeader.displayName = 'PageHeader';
