/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiBetaBadge, EuiLink, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LinkDescriptor, useLinkProps } from '@kbn/observability-plugin/public';
import { css } from '@emotion/react';
import { EuiIconType } from '@elastic/eui/src/components/icon/icon';
import { EuiLinkColor } from '@elastic/eui';
import { ExperimentalBadge } from './experimental_badge';

interface Props {
  color?: EuiLinkColor;
  'data-test-subj'?: string;
  experimental?: boolean;
  icon?: EuiIconType;
  label: string;
  link: LinkDescriptor;
  showBadge?: boolean;
  onClick?: () => void;
}
export const TryItButton = ({
  icon,
  label,
  link,
  color = 'primary',
  experimental = false,
  showBadge = false,
  onClick,
  ...props
}: Props) => {
  const linkProps = useLinkProps({ ...link });

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      gutterSize="m"
      css={css`
        position: relative;
      `}
    >
      {showBadge && (
        <EuiFlexItem grow={false}>
          <EuiBetaBadge
            color={'accent'}
            href={linkProps.href ?? ''}
            data-test-subj={`${props['data-test-subj']}-badge`}
            label={i18n.translate('xpack.infra.layout.tryIt', {
              defaultMessage: 'Try it',
            })}
          />
        </EuiFlexItem>
      )}

      <EuiFlexItem grow={false}>
        <EuiLink
          data-test-subj={props['data-test-subj']}
          {...linkProps}
          color={color}
          onClick={onClick}
        >
          <EuiFlexGroup wrap={false} responsive={false} gutterSize="m" alignItems="center">
            {icon && (
              <EuiFlexItem grow={false}>
                {experimental ? (
                  <ExperimentalBadge iconType={icon} tooltipPosition="top" />
                ) : (
                  <EuiIcon type={icon} color={color} />
                )}
              </EuiFlexItem>
            )}
            <EuiFlexItem>{label}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiLink>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
