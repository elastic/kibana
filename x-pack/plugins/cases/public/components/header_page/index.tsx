/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import styled, { css } from 'styled-components';
import { useAllCasesNavigation } from '../../common/navigation';

import { LinkIcon } from '../link_icon';
import { Subtitle, SubtitleProps } from '../subtitle';
import { Title } from './title';
import { BadgeOptions, TitleProp } from './types';
import * as i18n from './translations';

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

const Badge = styled(EuiBadge)`
  letter-spacing: 0;
` as unknown as typeof EuiBadge;
Badge.displayName = 'Badge';

export interface HeaderPageProps extends HeaderProps {
  showBackButton?: boolean;
  badgeOptions?: BadgeOptions;
  children?: React.ReactNode;
  subtitle?: SubtitleProps['items'];
  subtitle2?: SubtitleProps['items'];
  title: TitleProp;
  titleNode?: React.ReactElement;
}

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  showBackButton = false,
  badgeOptions,
  border,
  children,
  isLoading,
  subtitle,
  subtitle2,
  title,
  titleNode,
  ...rest
}) => {
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
    <Header border={border} {...rest}>
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

          {titleNode || <Title title={title} badgeOptions={badgeOptions} />}

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
