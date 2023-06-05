/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';

import { WelcomePanel } from './welcome_panel';
import { TogglePanel } from './toggle_panel';
import {
  GET_STARTED_PAGE_DESCRIPTION,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_TITLE,
} from './translations';

export const GetStartedComponent: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <KibanaPageTemplate restrictWidth={false} contentBorder={false}>
      <KibanaPageTemplate.Header
        css={css`
          padding: 0 ${euiTheme.base * 2.25}px;
        `}
        pageTitle={
          <EuiTitle
            size="l"
            css={css`
              padding-left: ${euiTheme.size.xs};
            `}
          >
            <span>{GET_STARTED_PAGE_TITLE}</span>
          </EuiTitle>
        }
        description={
          <>
            <strong className="eui-displayBlock">{GET_STARTED_PAGE_SUBTITLE}</strong>
            <span className="eui-displayBlock">{GET_STARTED_PAGE_DESCRIPTION}</span>
          </>
        }
      >
        <WelcomePanel />
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={true}
        restrictWidth={false}
        paddingSize="none"
      >
        <TogglePanel />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};
export const GetStarted = React.memo(GetStartedComponent);
