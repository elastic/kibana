/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import { isString } from 'lodash';
import { euiThemeVars } from '@kbn/ui-theme';
import { css } from '@emotion/react';

import { LinkIcon } from './link_icon';
import * as i18n from '../translations';
import { TruncatedText } from './truncated_text';
import { useMaintenanceWindowsNavigation } from '../../../hooks/use_navigation';

export const styles = {
  linkBack: css`
    font-size: ${euiThemeVars.euiFontSizeXS};
    line-height: ${euiThemeVars.euiLineHeight};
    margin-bottom: ${euiThemeVars.euiSizeS};
  `,
};

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
  const { navigateToMaintenanceWindows } = useMaintenanceWindowsNavigation();

  const navigateToMaintenanceWindowsClick = useCallback(() => {
    navigateToMaintenanceWindows();
  }, [navigateToMaintenanceWindows]);

  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem grow={false}>
        {showBackButton && (
          <div data-test-subj="link-back" css={styles.linkBack}>
            <LinkIcon onClick={navigateToMaintenanceWindowsClick} iconType="arrowLeft">
              {i18n.MAINTENANCE_WINDOWS_RETURN_LINK}
            </LinkIcon>
          </div>
        )}
        <Title title={title} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
});
PageHeader.displayName = 'PageHeader';
