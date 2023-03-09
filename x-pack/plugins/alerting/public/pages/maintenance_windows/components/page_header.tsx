/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import styled, { css } from 'styled-components';
import { isString } from 'lodash';

import { LinkIcon } from './link_icon';
import * as i18n from '../translations';
import { TruncatedText } from './truncated_text';
import { useMaintenanceWindowsNavigation } from '../../../hooks/use_navigation';

const LinkBack = styled.div.attrs({
  className: 'maintenanceWindowsPageHeader__linkBack',
})`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    margin-bottom: ${theme.eui.euiSizeS};
  `}
`;
LinkBack.displayName = 'LinkBack';

interface TitleProps {
  title: string | React.ReactNode;
}
const Title = React.memo<TitleProps>(({ title }) => {
  return (
    <EuiFlexGroup alignItems="baseline" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiTitle size="l">
          <h1>{isString(title) ? <TruncatedText text={title} /> : title}</h1>
        </EuiTitle>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
Title.displayName = 'Title';

export interface PageHeaderProps {
  showBackButton?: boolean;
  title: string | React.ReactNode;
}

export const PageHeader = React.memo<PageHeaderProps>(({ showBackButton = false, title }) => {
  const { getMaintenanceWindowsUrl, navigateToMaintenanceWindows } =
    useMaintenanceWindowsNavigation();

  const navigateToMaintenanceWindowsClick = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
      }
      navigateToMaintenanceWindows();
    },
    [navigateToMaintenanceWindows]
  );

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          {showBackButton && (
            <LinkBack>
              <LinkIcon
                onClick={navigateToMaintenanceWindowsClick}
                href={getMaintenanceWindowsUrl()}
                iconType="arrowLeft"
              >
                {i18n.MAINTENANCE_WINDOWS_RETURN_LINK}
              </LinkIcon>
            </LinkBack>
          )}
          <Title title={title} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="xl" />
    </>
  );
});
PageHeader.displayName = 'PageHeader';
