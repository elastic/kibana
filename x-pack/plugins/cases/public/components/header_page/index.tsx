/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiProgress } from '@elastic/eui';
import React from 'react';
import styled, { css } from 'styled-components';

import { LinkIcon, LinkIconProps } from '../link_icon';
import { Subtitle, SubtitleProps } from '../subtitle';
import { Title } from './title';
import { BadgeOptions, TitleProp } from './types';
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

const Badge = (styled(EuiBadge)`
  letter-spacing: 0;
` as unknown) as typeof EuiBadge;
Badge.displayName = 'Badge';

interface BackOptions {
  href: LinkIconProps['href'];
  onClick?: (ev: MouseEvent) => void;
  text: LinkIconProps['children'];
  dataTestSubj?: string;
}

export interface HeaderPageProps extends HeaderProps {
  backOptions?: BackOptions;
  /** A component to be displayed as the back button. Used only if `backOption` is not defined */
  backComponent?: React.ReactNode;
  badgeOptions?: BadgeOptions;
  children?: React.ReactNode;
  subtitle?: SubtitleProps['items'];
  subtitle2?: SubtitleProps['items'];
  title: TitleProp;
  titleNode?: React.ReactElement;
}

const HeaderPageComponent: React.FC<HeaderPageProps> = ({
  backOptions,
  backComponent,
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
  return (
    <Header border={border} {...rest}>
      <EuiFlexGroup alignItems="center">
        <FlexItem>
          {backOptions && (
            <LinkBack>
              <LinkIcon
                dataTestSubj={backOptions.dataTestSubj}
                onClick={backOptions.onClick}
                href={backOptions.href}
                iconType="arrowLeft"
              >
                {backOptions.text}
              </LinkIcon>
            </LinkBack>
          )}

          {!backOptions && backComponent && <>{backComponent}</>}

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

export const HeaderPage = React.memo(HeaderPageComponent);
