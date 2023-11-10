/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTitle,
  useEuiTheme,
  useEuiShadow,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';
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
import { useUserName } from '../common/hooks/use_user_name';
import launch from './images/launch.png';
import { Progress } from './progress_bar';

const CONTENT_WIDTH = 1150;

export interface GetStartedProps {
  productTypes: SecurityProductTypes;
}

export const GetStartedComponent: React.FC<GetStartedProps> = ({ productTypes }) => {
  const { euiTheme } = useEuiTheme();
  const shadow = useEuiShadow('s');
  const userName = useUserName();
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
      <KibanaPageTemplate.Section
        restrictWidth={CONTENT_WIDTH}
        css={css`
          padding: 0 ${euiTheme.base * 2.25}px;
        `}
      >
        <EuiFlexGroup
          css={css`
            background-image: url(${launch});
            background-size: 40%;
            background-repeat: no-repeat;
            background-position-x: right;
            background-position-y: center;
          `}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              width: ${CONTENT_WIDTH / 2}px;
            `}
          >
            <EuiTitle
              size="l"
              css={css`
                padding-left: ${euiTheme.size.xs};
                padding-bottom: ${euiTheme.size.l};
              `}
            >
              <>
                {userName && (
                  <span
                    css={css`
                      font-size: ${euiTheme.size.l};
                      color: ${euiTheme.colors.darkShade};
                      font-weight: ${euiTheme.font.weight.bold};
                    `}
                  >
                    {GET_STARTED_PAGE_TITLE(userName)}
                  </span>
                )}
                <EuiSpacer size="m" />
              </>
            </EuiTitle>
            <span
              css={css`
                font-size: ${euiTheme.base * 2.125}px;
                color: ${euiTheme.colors.title};
                font-weight: ${euiTheme.font.weight.bold};
              `}
              className="eui-displayBlock"
            >
              {GET_STARTED_PAGE_SUBTITLE}
            </span>
            <EuiSpacer size="m" />
            <span
              className="eui-displayBlock"
              css={css`
                font-size: ${euiTheme.base}px;
                color: ${euiTheme.colors.darkShade};
                line-height: ${euiTheme.size.l};
              `}
            >
              {GET_STARTED_PAGE_DESCRIPTION}
            </span>
          </EuiFlexItem>
        </EuiFlexGroup>
      </KibanaPageTemplate.Section>
      <KibanaPageTemplate.Section
        restrictWidth={CONTENT_WIDTH}
        css={css`
          background-color: ${euiTheme.colors.lightestShade};
        `}
      >
        <>
          <EuiSpacer size="m" />
          <Progress
            totalActiveSteps={totalActiveSteps}
            totalStepsLeft={totalStepsLeft}
            productTier={productTier}
          />
        </>
      </KibanaPageTemplate.Section>

      <KibanaPageTemplate.Section
        bottomBorder="extended"
        grow={true}
        restrictWidth={CONTENT_WIDTH}
        paddingSize="none"
        css={css`
          padding: 0 ${euiTheme.base * 2.25}px;
          background-color: ${euiTheme.colors.lightestShade};
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
