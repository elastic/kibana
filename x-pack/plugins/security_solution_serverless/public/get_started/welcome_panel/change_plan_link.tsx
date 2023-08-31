/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SecurityPageName } from '@kbn/security-solution-plugin/common';
import { LinkAnchor } from '@kbn/security-solution-navigation/links';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
  useEuiBackgroundColorCSS,
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { ProductTier } from '../../../common/product';
import { ProductTierBadge } from './product_tier_badge';
import { WELCOME_PANEL_PROJECT_CREATED_CHANGE_PLAN_TITLE } from './translations';
import { Spacer } from './spacer';

const ChangePlanLinkComponent = ({ productTier }: { productTier: ProductTier | undefined }) => {
  const { euiTheme } = useEuiTheme();
  const colorStyles = useEuiBackgroundColorCSS();
  const cssStyles = [colorStyles.primary];
  return productTier ? (
    <>
      {/* <div> cannot appear as a descendant of <p>, EuiSpacer is a div */}
      <Spacer />
      <EuiFlexGroup
        justifyContent="flexEnd"
        component="span"
        css={css`
          margin-top: -6px;
        `}
      >
        <EuiFlexItem grow={false} component="span">
          <span
            className="eui-displayBlock"
            css={css`
              ${cssStyles};
              border-radius: ${euiTheme.border.radius.medium};
              padding: 0 ${euiTheme.size.m};
              line-height: ${euiTheme.base * 2}px;
            `}
          >
            <ProductTierBadge productTier={productTier} />
            <LinkAnchor
              className="eui-alignMiddle"
              id={SecurityPageName.projectSettings}
              css={css`
                color: ${euiTheme.colors.primaryText};
                padding-left: ${euiTheme.size.m};
              `}
            >
              {WELCOME_PANEL_PROJECT_CREATED_CHANGE_PLAN_TITLE}
              <EuiIcon type="arrowRight" />
            </LinkAnchor>
          </span>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  ) : null;
};

export const ChangePlanLink = React.memo(ChangePlanLinkComponent);
