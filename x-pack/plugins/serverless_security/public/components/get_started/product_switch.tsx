/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, EuiSwitch, EuiText, EuiThemeComputed, EuiTitle } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import * as i18n from './translations';
import { ProductId, Switch } from './types';

const switches: Switch[] = [
  {
    id: ProductId.analytics,
    label: i18n.ANALYTICS_SWITCH_LABEL,
  },
  {
    id: ProductId.cloud,
    label: i18n.CLOUD_SWITCH_LABEL,
  },
  {
    id: ProductId.endpoint,
    label: i18n.ENDPOINT_SWITCH_LABEL,
  },
];

const ProductSwitchComponent: React.FC<{
  onProductSwitchChanged: (item: Switch) => void;
  activeSections: Set<ProductId>;
  shadow?: string;
  euiTheme: EuiThemeComputed;
}> = ({ onProductSwitchChanged, activeSections, euiTheme, shadow = '' }) => {
  const switchNodes = useMemo(
    () =>
      switches.map((item) => (
        <EuiSwitch
          key={item.id}
          data-test-subj={item.id}
          label={item.label}
          onChange={() => onProductSwitchChanged(item)}
          css={css`
            padding-left: 10px;
          `}
          checked={activeSections.has(item.id)}
        />
      )),
    [activeSections, onProductSwitchChanged]
  );

  return (
    <EuiPanel
      color="plain"
      element="div"
      grow={false}
      paddingSize="none"
      hasShadow={false}
      css={css`
        padding: ${euiTheme.base * 1.25}px ${euiTheme.base * 2.25}px;
        ${shadow};
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
