/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle, useEuiTheme, useEuiShadow, EuiSpacer } from '@elastic/eui';
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
import type { SecurityProductTypes } from '../../common/config';
import { ProductSwitch } from './product_switch';
import { useTogglePanel } from './use_toggle_panel';
import { ProductLine } from '../../common/product';

const CONTENT_WIDTH = 1150;

export interface GetStartedProps {
  productTypes: SecurityProductTypes;
}

export const GetStartedComponent: React.FC<GetStartedProps> = ({ productTypes }) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');

  const {
    onProductSwitchChanged,
    onCardClicked,
    onStepClicked,
    onStepButtonClicked,
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
      <KibanaPageTemplate.Header
        restrictWidth={CONTENT_WIDTH}
        css={css`
          padding: 0 ${euiTheme.base * 2.25}px;
        `}
        pageTitle={
          <EuiTitle
            size="l"
            css={css`
              padding-left: ${euiTheme.size.xs};
              padding-bottom: ${euiTheme.size.l};
            `}
          >
            <span>{GET_STARTED_PAGE_TITLE}</span>
          </EuiTitle>
        }
        description={
          <>
            <strong
              css={css`
                font-size: ${euiTheme.base * 1.37}px;
              `}
              className="eui-displayBlock"
            >
              {GET_STARTED_PAGE_SUBTITLE}
            </strong>
            <EuiSpacer size="m" />
            <span className="eui-displayBlock">{GET_STARTED_PAGE_DESCRIPTION}</span>
          </>
        }
      >
        <WelcomePanel
          totalActiveSteps={totalActiveSteps}
          totalStepsLeft={totalStepsLeft}
          productTier={productTier}
        />
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section
        bottomBorder={false}
        grow={true}
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        css={css`
          ${shadow};
          z-index: 1;
          flex-grow: 0;
          padding: 0 ${euiTheme.base * 2.25}px;
        `}
      >
        <ProductSwitch
          onProductSwitchChanged={onProductSwitchChanged}
          activeProducts={activeProducts}
          euiTheme={euiTheme}
        />
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={true}
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        css={css`
          padding: 0 ${euiTheme.base * 2.25}px;
        `}
      >
        <TogglePanel
          finishedSteps={finishedSteps}
          activeSections={activeSections}
          activeProducts={activeProducts}
          expandedCardSteps={expandedCardSteps}
          onStepClicked={onStepClicked}
          onCardClicked={onCardClicked}
          onStepButtonClicked={onStepButtonClicked}
        />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

GetStartedComponent.displayName = 'GetStartedComponent';
export const GetStarted = React.memo(GetStartedComponent);

// eslint-disable-next-line import/no-default-export
export default GetStarted;
