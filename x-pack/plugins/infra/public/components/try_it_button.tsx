/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiLink } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkDescriptor, useLinkProps } from '@kbn/observability-shared-plugin/public';
import { css } from '@emotion/react';
import { EuiLinkColor } from '@elastic/eui';
import { ExperimentalBadge } from './experimental_badge';

type OnClickEvent = React.MouseEvent | React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>;
interface Props {
  color?: EuiLinkColor;
  'data-test-subj'?: string;
  experimental?: boolean;
  label: string;
  link: LinkDescriptor;
  hideBadge?: boolean;
  onClick?: (e?: OnClickEvent) => void;
}
export const TryItButton = ({
  label,
  link,
  color = 'primary',
  experimental = false,
  hideBadge = false,
  onClick,
  ...props
}: Props) => {
  const linkProps = useLinkProps({ ...link });

  const handleClick = (event: OnClickEvent) => {
    if (linkProps.onClick) linkProps.onClick(event);
    if (onClick) onClick(event);
  };

  return (
    <EuiFlexGroup responsive={false} alignItems="center" gutterSize="m">
      {!hideBadge && (
        <EuiFlexItem grow={false}>
          <EuiLink
            data-test-subj={`${props['data-test-subj']}-badge`}
            {...linkProps}
            onClick={handleClick}
          >
            <EuiBetaBadge
              css={css`
                cursor: pointer;
              `}
              color={'accent'}
              label={i18n.translate('xpack.infra.layout.tryIt', {
                defaultMessage: 'Try it',
              })}
            />
          </EuiLink>
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj={props['data-test-subj']}
          {...linkProps}
          color={color}
          onClick={handleClick}
        >
          <EuiFlexGroup wrap={false} responsive={false} gutterSize="m" alignItems="center">
            {experimental && (
              <EuiFlexItem grow={false}>
                <ExperimentalBadge iconType="beaker" tooltipPosition="top" />
              </EuiFlexItem>
            )}
            <EuiFlexItem>{label}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
