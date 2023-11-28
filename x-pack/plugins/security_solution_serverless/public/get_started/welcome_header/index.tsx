/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { useUserName } from '../../common/hooks/use_user_name';
import { getProjectFeaturesUrl } from '../../navigation/links/util';
import launch from '../images/launch.png';

import {
  GET_STARTED_PAGE_TITLE,
  GET_STARTED_PAGE_SUBTITLE,
  GET_STARTED_PAGE_DESCRIPTION,
  CURRENT_PLAN_LABEL,
} from '../translations';
import { CONTENT_WIDTH } from '../helpers';
import { ProductTierBadge } from './product_tier_badge';
import { useKibana } from '../../common/services';
import type { ProductTier } from '../../../common/product';

const WelcomeHeaderComponent: React.FC<{ productTier?: ProductTier }> = ({ productTier }) => {
  const { euiTheme } = useEuiTheme();
  const userName = useUserName();
  const { cloud } = useKibana().services;

  return (
    <EuiFlexGroup
      css={css`
        background-image: url(${launch});
        background-size: 40%;
        background-repeat: no-repeat;
        background-position-x: right;
        background-position-y: center;
        padding: ${euiTheme.base * 0.625}px 0;
      `}
      data-test-subj="welcome-header"
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
                aria-label={CURRENT_PLAN_LABEL}
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
  );
};

export const WelcomeHeader = React.memo(WelcomeHeaderComponent);
