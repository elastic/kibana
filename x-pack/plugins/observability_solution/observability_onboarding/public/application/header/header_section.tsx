/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPageTemplate, EuiSpacer } from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { Header } from './header';
import backgroundImageUrl from './background.svg';
import { KubernetesHeaderSection } from './kubernetes_header';

interface Props {
  pathname: string;
}

export function HeaderSection({ pathname }: Props) {
  if (pathname.startsWith('/kubernetes')) {
    return <KubernetesHeaderSection />;
  }
  return (
    <EuiPageTemplate.Section
      paddingSize="xl"
      css={css`
        & > div {
          background-image: url(${backgroundImageUrl});
          background-position: right center;
          background-repeat: no-repeat;
        }
      `}
      grow={false}
      restrictWidth
    >
      <EuiSpacer size="xl" />
      <Header />
    </EuiPageTemplate.Section>
  );
}
