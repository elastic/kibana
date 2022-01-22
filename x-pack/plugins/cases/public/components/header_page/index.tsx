/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPageHeader } from '@elastic/eui';

import { Subtitle, SubtitleProps } from '../subtitle';
import { Title } from './title';
import { BadgeOptions, TitleProp } from './types';

interface HeaderProps {
  border?: boolean;
  isLoading?: boolean;
}

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
  return (
    <>
      <EuiPageHeader
        pageTitle={titleNode || <Title title={title} badgeOptions={badgeOptions} />}
        {...rest}
      />
      {subtitle && <Subtitle data-test-subj="header-page-subtitle" items={subtitle} />}
      {subtitle2 && <Subtitle data-test-subj="header-page-subtitle-2" items={subtitle2} />}

      {children && <div data-test-subj="header-page-supplements">{children}</div>}
    </>
  );
};
HeaderPageComponent.displayName = 'HeaderPage';

export const HeaderPage = React.memo(HeaderPageComponent);
