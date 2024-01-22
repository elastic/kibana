/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEuiTheme } from '@elastic/eui';
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { TogglePanel } from './toggle_panel';

import type { SecurityProductTypes } from '../../common/config';
import { useTogglePanel } from './hooks/use_toggle_panel';
import { ProductLine } from '../../common/product';
import { Progress } from './progress_bar';
import { StepContextProvider } from './context/step_context';
import { CONTENT_WIDTH } from './helpers';
import { WelcomeHeader } from './welcome_header';
import { Footer } from './footer';
import { useScrollToHash } from './hooks/use_scroll';

export interface GetStartedProps {
  indicesExist?: boolean;
  productTypes: SecurityProductTypes;
}

export const GetStartedComponent: React.FC<GetStartedProps> = ({ productTypes, indicesExist }) => {
  const { euiTheme } = useEuiTheme();
  const {
    onStepClicked,
    toggleTaskCompleteStatus,
    state: {
      activeProducts,
      activeSections,
      finishedSteps,
      totalActiveSteps,
      totalStepsLeft,
      expandedCardSteps,
    },
  } = useTogglePanel({ productTypes });
  const productTier = productTypes.find(
    (product) => product.product_line === ProductLine.security
  )?.product_tier;

  useScrollToHash();

  return (
    <KibanaPageTemplate
      restrictWidth={false}
      contentBorder={false}
      grow={true}
      /* this is the only page without padding in Security Solution,
       **  ignoring main page wrapper padding using absolute positioning
       */
      css={css`
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        position: absolute;
      `}
    >
      <KibanaPageTemplate.Section
        restrictWidth={CONTENT_WIDTH}
        paddingSize="xl"
        css={css`
          padding: 0 ${euiTheme.size.xxl};
        `}
      >
        <WelcomeHeader productTier={productTier} />
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        css={css`
          background-color: ${euiTheme.colors.lightestShade};
          padding: ${euiTheme.size.xxl} ${euiTheme.size.xxl} ${euiTheme.size.m};
        `}
      >
        <Progress
          totalActiveSteps={totalActiveSteps}
          totalStepsLeft={totalStepsLeft}
          productTier={productTier}
        />
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={true}
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        css={css`
          padding: 0 ${euiTheme.size.xxl} ${euiTheme.size.xxxl};
          background-color: ${euiTheme.colors.lightestShade};
        `}
      >
        <StepContextProvider
          expandedCardSteps={expandedCardSteps}
          finishedSteps={finishedSteps}
          indicesExist={!!indicesExist}
          onStepClicked={onStepClicked}
          toggleTaskCompleteStatus={toggleTaskCompleteStatus}
        >
          <TogglePanel activeProducts={activeProducts} activeSections={activeSections} />
        </StepContextProvider>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section grow={true} restrictWidth={CONTENT_WIDTH} paddingSize="none">
        <Footer />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

export const GetStarted = React.memo(GetStartedComponent);

// eslint-disable-next-line import/no-default-export
export default GetStarted;
