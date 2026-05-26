/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiAvatarProps } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { StatusHeaderVariant } from './status_header';
import { resolveStatusHeaderContent } from './status_header';

export interface StatusHeaderBannerProps {
  variant?: StatusHeaderVariant;
  title?: string;
  description?: React.ReactNode;
  iconType?: NonNullable<EuiAvatarProps['iconType']>;
  iconColor?: EuiAvatarProps['color'];
  iconGlyphColor?: EuiAvatarProps['iconColor'];
  timestamp?: React.ReactNode;
  onMenuClick?: () => void;
  /**
   * Maximum width applied to the inner content wrapper so the icon, title and actions
   * align with the page's main content column. The outer banner remains full width
   * so the background extends edge-to-edge.
   */
  contentMaxWidth?: number | string;
  'data-test-subj'?: string;
}

const MORE_OPTIONS_LABEL = i18n.translate(
  'xpack.nightshift.sigeventsOverview.statusHeaderBanner.moreOptionsAriaLabel',
  { defaultMessage: 'More options' }
);

export const StatusHeaderBanner = ({
  variant = 'critical',
  title,
  description,
  iconType,
  iconColor,
  iconGlyphColor,
  timestamp,
  onMenuClick,
  contentMaxWidth,
  'data-test-subj': dataTestSubj = 'sigeventsOverviewStatusHeaderBanner',
}: StatusHeaderBannerProps) => {
  const { euiTheme } = useEuiTheme();

  const {
    title: resolvedTitle,
    description: resolvedDefaultDescription,
    iconType: resolvedIconType,
    iconColor: resolvedIconColor,
    iconGlyphColor: resolvedIconGlyphColor,
  } = resolveStatusHeaderContent(euiTheme, {
    variant,
    title,
    // The shared resolver works on plain strings; only forward `description` if
    // it is a string so callers can still pass arbitrary ReactNode markup below.
    description: typeof description === 'string' ? description : undefined,
    iconType,
    iconColor,
    iconGlyphColor,
  });

  const resolvedDescription =
    typeof description === 'string' || description === undefined
      ? resolvedDefaultDescription
      : description;

  const wrapperCss = css`
    width: 100%;
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    border-bottom: ${euiTheme.border.thin};
    padding: 14px ${euiTheme.size.m};
    box-sizing: border-box;
  `;

  const contentCss = css`
    width: 100%;
    max-width: ${typeof contentMaxWidth === 'number'
      ? `${contentMaxWidth}px`
      : contentMaxWidth ?? 'none'};
    margin: 0 auto;
  `;

  return (
    <div css={wrapperCss} data-test-subj={dataTestSubj}>
      <div css={contentCss}>
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiAvatar
              size="m"
              name={resolvedTitle}
              iconType={resolvedIconType}
              color={resolvedIconColor}
              iconColor={resolvedIconGlyphColor}
              aria-hidden
            />
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup
              gutterSize="s"
              alignItems="center"
              justifyContent="spaceBetween"
              responsive={false}
              wrap={false}
            >
              <EuiFlexItem>
                <EuiTitle size="xxs">
                  <h2>{resolvedTitle}</h2>
                </EuiTitle>
              </EuiFlexItem>

              {(timestamp || onMenuClick) && (
                <EuiFlexItem grow={false}>
                  <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                    {timestamp && (
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {timestamp}
                        </EuiText>
                      </EuiFlexItem>
                    )}
                    {onMenuClick && (
                      <EuiFlexItem grow={false}>
                        <EuiButtonIcon
                          iconType="boxesVertical"
                          color="text"
                          size="xs"
                          aria-label={MORE_OPTIONS_LABEL}
                          onClick={onMenuClick}
                          data-test-subj={`${dataTestSubj}MoreButton`}
                        />
                      </EuiFlexItem>
                    )}
                  </EuiFlexGroup>
                </EuiFlexItem>
              )}
            </EuiFlexGroup>

            <EuiText size="xs" color="subdued">
              {typeof resolvedDescription === 'string' ? (
                <p>{resolvedDescription}</p>
              ) : (
                resolvedDescription
              )}
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </div>
  );
};
