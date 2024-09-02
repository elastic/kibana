/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiProgress, useEuiFontSize, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';

import { useAllCasesNavigation } from '../../common/navigation';
import { LinkIcon } from '../link_icon';
import { Title } from './title';
import * as i18n from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';

interface HeaderProps {
  border?: boolean;
  isLoading?: boolean;
}

export interface HeaderPageProps extends HeaderProps {
  showBackButton?: boolean;
  children?: React.ReactNode;
  title: string | React.ReactNode;
  titleNode?: React.ReactElement;
  'data-test-subj'?: string;
}

const getHeaderCss = (euiTheme: EuiThemeComputed<{}>, border?: boolean) => css`
  margin-bottom: ${euiTheme.size.l};
  ${border &&
  css`
    border-bottom: ${euiTheme.border.thin};
    padding-bottom: ${euiTheme.size.l};
    .euiProgress {
      top: ${euiTheme.size.l};
    }
  `}
`;

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  showBackButton = false,
  border,
  children,
  isLoading,
  title,
  titleNode,
  'data-test-subj': dataTestSubj,
}) => {
  const { releasePhase } = useCasesContext();
  const { navigateToAllCases } = useAllCasesNavigation();
  const { euiTheme } = useEuiTheme();
  const xsFontSize = useEuiFontSize('xs').fontSize;

  const navigateToAllCasesClick = useCallback(
    (e: React.SyntheticEvent) => {
      if (e) {
        e.preventDefault();
      }
      navigateToAllCases();
    },
    [navigateToAllCases]
  );

  return (
    <header css={getHeaderCss(euiTheme, border)} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem
          css={css`
            overflow: hidden;
            display: block;
          `}
        >
          {showBackButton && (
            <div
              className="casesHeaderPage__linkBack"
              css={css`
                font-size: ${xsFontSize};
                margin-bottom: ${euiTheme.size.s};
              `}
            >
              <LinkIcon
                dataTestSubj="backToCases"
                onClick={navigateToAllCasesClick}
                iconType="arrowLeft"
              >
                {i18n.BACK_TO_ALL}
              </LinkIcon>
            </div>
          )}

          {titleNode || <Title title={title} releasePhase={releasePhase} />}

          {border && isLoading && <EuiProgress size="xs" color="accent" />}
        </EuiFlexItem>

        {children && (
          <EuiFlexItem
            data-test-subj="header-page-supplements"
            css={css`
              display: block;
            `}
            grow={false}
          >
            {children}
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </header>
  );
};
HeaderPageComponent.displayName = 'HeaderPage';

export const HeaderPage = React.memo(HeaderPageComponent);
