/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AccessorConfig } from '../../../types';

export function ColorIndicator({
  accessorConfig,
  children,
}: {
  accessorConfig: AccessorConfig;
  children: React.ReactChild;
}) {
  let indicatorIcon = null;
  if (accessorConfig.triggerIcon && accessorConfig.triggerIcon !== 'none') {
    const baseIconProps = {
      size: 's',
      className: 'lnsLayerPanel__colorIndicator',
    } as const;

    indicatorIcon = (
      <EuiFlexItem grow={false}>
        {accessorConfig.triggerIcon === 'color' && accessorConfig.color && (
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
        {accessorConfig.triggerIcon === 'disabled' && (
          <EuiIcon
            {...baseIconProps}
            type="stopSlash"
            color="subdued"
            aria-label={i18n.translate('xpack.lens.editorFrame.noColorIndicatorLabel', {
              defaultMessage: 'This dimension does not have an individual color',
            })}
          />
        )}
        {accessorConfig.triggerIcon === 'colorBy' && (
          <EuiIcon
            {...baseIconProps}
            type="brush"
            color="text"
            aria-label={i18n.translate('xpack.lens.editorFrame.paletteColorIndicatorLabel', {
              defaultMessage: 'This dimension is using a palette',
            })}
          />
        )}
      </EuiFlexItem>
    );
  }

  return (
    <EuiFlexGroup gutterSize="none" alignItems="center">
      {indicatorIcon}
      <EuiFlexItem>{children}</EuiFlexItem>
    </EuiFlexGroup>
  );
}
