/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiTitle,
  useEuiTheme,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
} from '@elastic/eui';
import React from 'react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { css } from '@emotion/react';
import { TogglePanel } from './toggle_panel';
import {
  CURRENT_PLAN_LABEL,
  GET_STARTED_PAGE_DESCRIPTION,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_TITLE,
} from './translations';
import type { SecurityProductTypes } from '../../common/config';
import { useTogglePanel } from './hooks/use_toggle_panel';
import { ProductLine } from '../../common/product';
import { useUserName } from '../common/hooks/use_user_name';
import launch from './images/launch.png';
import { Progress } from './progress_bar';
import { ProductTierBadge } from './welcome_panel/product_tier_badge';
import { useKibana } from '../common/services';
import { getProjectFeaturesUrl } from '../navigation/links/util';
import { StepContextProvider } from './context/step_context';

const CONTENT_WIDTH = 1150;

export interface GetStartedProps {
  productTypes: SecurityProductTypes;
}

export const GetStartedComponent: React.FC<GetStartedProps> = ({ productTypes }) => {
  const { euiTheme } = useEuiTheme();
  const userName = useUserName();
  const {
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
  const { cloud } = useKibana().services;

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
        <EuiFlexGroup
          css={css`
            background-image: url(${launch});
            background-size: 40%;
            background-repeat: no-repeat;
            background-position-x: right;
            background-position-y: center;
            padding: ${euiTheme.base * 0.625}px 0;
          `}
        >
          <EuiFlexItem
            grow={false}
            css={css`
              width: ${CONTENT_WIDTH / 2}px;
            `}
          >
            {userName && (
              <EuiTitle
                size="l"
                css={css`
                  padding-bottom: ${euiTheme.size.s};
                  font-size: ${euiTheme.base}px;
                  color: ${euiTheme.colors.darkShade};
                  font-weight: ${euiTheme.font.weight.bold};
                  line-height: ${euiTheme.size.l};
                `}
              >
                <span>{GET_STARTED_PAGE_TITLE(userName)}</span>
              </EuiTitle>
            )}
            <EuiSpacer size="s" />
            <span
              css={css`
                font-size: ${euiTheme.size.l};
                color: ${euiTheme.colors.title};
                font-weight: ${euiTheme.font.weight.bold};
              `}
              className="eui-displayBlock"
            >
              {GET_STARTED_PAGE_SUBTITLE}
            </span>
            <EuiSpacer size="s" />
            <span
              className="eui-displayBlock"
              css={css`
                font-size: ${euiTheme.base}px;
                color: ${euiTheme.colors.subduedText};
                line-height: ${euiTheme.size.l};
                font-weight: ${euiTheme.font.weight.regular};
              `}
            >
              {GET_STARTED_PAGE_DESCRIPTION}
            </span>
            <EuiSpacer size="l" />
            <div>
              <div
                className="eui-displayInlineBlock"
                css={css`
                  background-color: ${euiTheme.colors.lightestShade};
                  border-radius: 56px;
                  padding: ${euiTheme.size.xs} ${euiTheme.size.xs} ${euiTheme.size.xs}
                    ${euiTheme.size.s};
                  height: ${euiTheme.size.xl};
                `}
              >
                <span
                  css={css`
                    font-size: ${euiTheme.size.m};
                    font-weight: ${euiTheme.font.weight.bold};
                    padding-right: ${euiTheme.size.xs};
                  `}
                >
                  {CURRENT_PLAN_LABEL}
                </span>
                <ProductTierBadge productTier={productTier} />
                {productTier && (
                  <EuiButtonIcon
                    className="eui-alignMiddle"
                    color="primary"
                    href={getProjectFeaturesUrl(cloud)}
                    target="_blank"
                    iconType="gear"
                    size="xs"
                    css={css`
                      padding-left: ${euiTheme.size.xs};
                    `}
                  />
                )}
              </div>
            </div>
          </EuiFlexItem>
        </EuiFlexGroup>
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
          padding: 0 ${euiTheme.size.xxl};
          background-color: ${euiTheme.colors.lightestShade};
        `}
      >
        <StepContextProvider
          expandedCardSteps={expandedCardSteps}
          finishedSteps={finishedSteps}
          onStepButtonClicked={onStepButtonClicked}
        >
          <TogglePanel
            finishedSteps={finishedSteps}
            activeSections={activeSections}
            activeProducts={activeProducts}
            expandedCardSteps={expandedCardSteps}
            onStepClicked={onStepClicked}
            onStepButtonClicked={onStepButtonClicked}
          />
        </StepContextProvider>
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

GetStartedComponent.displayName = 'GetStartedComponent';
export const GetStarted = React.memo(GetStartedComponent);

// eslint-disable-next-line import/no-default-export
export default GetStarted;
