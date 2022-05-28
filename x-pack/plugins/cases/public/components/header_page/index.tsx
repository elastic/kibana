/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import styled, { css } from 'styled-components';

import { useAllCasesNavigation } from '../../common/navigation';
import { LinkIcon } from '../link_icon';
import { Subtitle, SubtitleProps } from '../subtitle';
import { Title } from './title';
import * as i18n from './translations';
import { useCasesContext } from '../cases_context/use_cases_context';

interface HeaderProps {
  border?: boolean;
  isLoading?: boolean;
}

const Header = styled.header.attrs({
  className: 'casesHeaderPage',
})<HeaderProps>`
  ${({ border, theme }) => css`
    margin-bottom: ${theme.eui.euiSizeL};

    ${border &&
    css`
      border-bottom: ${theme.eui.euiBorderThin};
      padding-bottom: ${theme.eui.paddingSizes.l};
      .euiProgress {
        top: ${theme.eui.paddingSizes.l};
      }
    `}
  `}
`;
Header.displayName = 'Header';

const FlexItem = styled(EuiFlexItem)`
  display: block;
`;
FlexItem.displayName = 'FlexItem';

const LinkBack = styled.div.attrs({
  className: 'casesHeaderPage__linkBack',
})`
  ${({ theme }) => css`
    font-size: ${theme.eui.euiFontSizeXS};
    line-height: ${theme.eui.euiLineHeight};
    margin-bottom: ${theme.eui.euiSizeS};
  `}
`;
LinkBack.displayName = 'LinkBack';

export interface HeaderPageProps extends HeaderProps {
  showBackButton?: boolean;
  children?: React.ReactNode;
  subtitle?: SubtitleProps['items'];
  subtitle2?: SubtitleProps['items'];
  title: string | React.ReactNode;
  titleNode?: React.ReactElement;
  'data-test-subj'?: string;
}

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  showBackButton = false,
  border,
  children,
  isLoading,
  subtitle,
  subtitle2,
  title,
  titleNode,
  'data-test-subj': dataTestSubj,
}) => {
  const { releasePhase } = useCasesContext();
  const { getAllCasesUrl, navigateToAllCases } = useAllCasesNavigation();

  const navigateToAllCasesClick = useCallback(
    (e) => {
      if (e) {
        e.preventDefault();
      }
      navigateToAllCases();
    },
    [navigateToAllCases]
  );

  return (
    <Header border={border} data-test-subj={dataTestSubj}>
      <EuiFlexGroup alignItems="center">
        <FlexItem>
          {showBackButton && (
            <LinkBack>
              <LinkIcon
                dataTestSubj="backToCases"
                onClick={navigateToAllCasesClick}
                href={getAllCasesUrl()}
                iconType="arrowLeft"
              >
                {i18n.BACK_TO_ALL}
              </LinkIcon>
            </LinkBack>
          )}

          {titleNode || <Title title={title} releasePhase={releasePhase} />}

          {subtitle && <Subtitle data-test-subj="header-page-subtitle" items={subtitle} />}
          {subtitle2 && <Subtitle data-test-subj="header-page-subtitle-2" items={subtitle2} />}
          {border && isLoading && <EuiProgress size="xs" color="accent" />}
        </FlexItem>

        {children && (
          <FlexItem data-test-subj="header-page-supplements" grow={false}>
            {children}
          </FlexItem>
        )}
      </EuiFlexGroup>
    </Header>
  );
};
HeaderPageComponent.displayName = 'HeaderPage';

export const HeaderPage = React.memo(HeaderPageComponent);
