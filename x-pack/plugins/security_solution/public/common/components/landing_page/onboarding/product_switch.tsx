/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSwitch, EuiText, EuiTitle, type EuiThemeComputed } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useMemo } from 'react';
import { ProductLine } from './configs';
import * as i18n from './translations';
import type { Switch } from './types';

const switches: Switch[] = [
  {
    id: ProductLine.security,
    label: i18n.ANALYTICS_SWITCH_LABEL,
  },
  {
    id: ProductLine.cloud,
    label: i18n.CLOUD_SWITCH_LABEL,
  },
  {
    id: ProductLine.endpoint,
    label: i18n.ENDPOINT_SWITCH_LABEL,
  },
];

const ProductSwitchComponent: React.FC<{
  onProductSwitchChanged: (item: Switch) => void;
  activeProducts: Set<ProductLine>;
  euiTheme: EuiThemeComputed;
}> = ({ onProductSwitchChanged, activeProducts, euiTheme }) => {
  const switchNodes = useMemo(
    () =>
      switches.map((item) => (
        <EuiSwitch
          key={item.id}
          data-test-subj={item.id}
          label={item.label}
          onChange={() => onProductSwitchChanged(item)}
          css={css`
            padding-left: ${euiTheme.base * 0.625}px;
          `}
          checked={activeProducts.has(item.id)}
        />
      )),
    [activeProducts, euiTheme.base, onProductSwitchChanged]
  );

  return (
    <EuiPanel
      data-test-subj="product-switch"
      color="plain"
      element="div"
      grow={false}
      paddingSize="none"
      hasShadow={false}
      css={css`
        padding: ${euiTheme.base * 1.25}px 0;
      `}
      borderRadius="none"
    >
      <EuiTitle
        size="xxs"
        css={css`
          padding-right: ${euiTheme.size.xs};
        `}
      >
        <strong>{i18n.TOGGLE_PANEL_TITLE}</strong>
      </EuiTitle>
      <EuiText size="s" className="eui-displayInline">
        {switchNodes}
      </EuiText>
    </EuiPanel>
  );
};
ProductSwitchComponent.displayName = 'ProductSwitchComponent';
export const ProductSwitch = ProductSwitchComponent;
