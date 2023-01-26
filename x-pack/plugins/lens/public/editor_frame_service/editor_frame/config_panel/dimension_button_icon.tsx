/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AccessorConfig, UserMessage } from '../../../types';
import { IconError, IconWarning } from '../custom_icons';

const baseIconProps = {
  size: 's',
  className: 'lnsLayerPanel__colorIndicator',
} as const;

const getIconFromAccessorConfig = (accessorConfig: AccessorConfig) => (
  <>
    {accessorConfig.triggerIconType === 'color' && accessorConfig.color && (
      <EuiIcon
        {...baseIconProps}
        color={accessorConfig.color}
        type="stopFilled"
        aria-label={i18n.translate('xpack.lens.editorFrame.colorIndicatorLabel', {
          defaultMessage: 'Color of this dimension: {hex}',
          values: {
            hex: accessorConfig.color,
          },
        })}
      />
    )}
    {accessorConfig.triggerIconType === 'disabled' && (
      <EuiIcon
        {...baseIconProps}
        type="stopSlash"
        color="subdued"
        aria-label={i18n.translate('xpack.lens.editorFrame.noColorIndicatorLabel', {
          defaultMessage: 'This dimension does not have an individual color',
        })}
      />
    )}
    {accessorConfig.triggerIconType === 'invisible' && (
      <EuiIcon
        {...baseIconProps}
        type="eyeClosed"
        color="subdued"
        aria-label={i18n.translate('xpack.lens.editorFrame.invisibleIndicatorLabel', {
          defaultMessage: 'This dimension is currently not visible in the chart',
        })}
      />
    )}
    {accessorConfig.triggerIconType === 'aggregate' && (
      <EuiIcon
        {...baseIconProps}
        type="fold"
        color="subdued"
        aria-label={i18n.translate('xpack.lens.editorFrame.aggregateIndicatorLabel', {
          defaultMessage:
            'This dimension is not visible in the chart because all individual values are aggregated into a single value',
        })}
      />
    )}
    {accessorConfig.triggerIconType === 'colorBy' && (
      <EuiIcon
        {...baseIconProps}
        type="brush"
        color="text"
        aria-label={i18n.translate('xpack.lens.editorFrame.paletteColorIndicatorLabel', {
          defaultMessage: 'This dimension is using a palette',
        })}
      />
    )}
    {accessorConfig.triggerIconType === 'custom' && accessorConfig.customIcon && (
      <EuiIcon
        {...baseIconProps}
        size="m"
        type={accessorConfig.customIcon}
        color={accessorConfig.color}
        aria-label={i18n.translate('xpack.lens.editorFrame.customIconIndicatorLabel', {
          defaultMessage: 'This dimension is using a custom icon',
        })}
      />
    )}
  </>
);

export function DimensionButtonIcon({
  accessorConfig,
  message,
  children,
}: {
  accessorConfig: AccessorConfig;
  message: UserMessage | undefined;
  children: React.ReactChild;
}) {
  let indicatorIcon = null;
  if (message || (accessorConfig.triggerIconType && accessorConfig.triggerIconType !== 'none')) {
    indicatorIcon = (
      <EuiToolTip
        display="block"
        content={message?.shortMessage || message?.longMessage || undefined}
      >
        <EuiFlexItem grow={false}>
          {message && (
            <EuiIcon
              {...baseIconProps}
              type={message.severity === 'error' ? IconError : IconWarning}
            />
          )}
          {!message && getIconFromAccessorConfig(accessorConfig)}
        </EuiFlexItem>
      </EuiToolTip>
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false}>
      {indicatorIcon}
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
