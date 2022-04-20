/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiIcon, EuiKeyPadMenuItem, EuiToolTip } from '@elastic/eui';
import { UiActionsPresentable as Presentable } from '@kbn/ui-actions-plugin/public';
import {
  txtBetaActionFactoryLabel,
  txtBetaActionFactoryTooltip,
  txtInsufficientLicenseLevel,
} from './i18n';

import './styles.scss';

export interface Item extends Presentable {
  isLicenseCompatible?: boolean;
  isBeta?: boolean;
}

export interface PresentablePickerItemProps {
  item: Item;
  context: unknown;
  onSelect: (itemId: string) => void;
}

export const TEST_SUBJ_PRESENTABLE_ITEM = 'actionFactoryItem';

export const PresentablePickerItem: React.FC<PresentablePickerItemProps> = ({
  item,
  context,
  onSelect,
}) => {
  const isLicenseCompatible = item.isLicenseCompatible ?? true;
  const showTooltip = !isLicenseCompatible;

  let content = (
    <EuiKeyPadMenuItem
      className="auaPresentablePicker__item"
      label={item.getDisplayName(context)}
      data-test-subj={`${TEST_SUBJ_PRESENTABLE_ITEM}-${item.id}`}
      onClick={() => onSelect(item.id)}
      disabled={!isLicenseCompatible}
      betaBadgeLabel={item.isBeta ? txtBetaActionFactoryLabel : undefined}
      betaBadgeTooltipContent={item.isBeta ? txtBetaActionFactoryTooltip : undefined}
    >
      {item.getIconType(context) && <EuiIcon type={item.getIconType(context)!} size="m" />}
    </EuiKeyPadMenuItem>
  );

  if (showTooltip) {
    content = <EuiToolTip content={txtInsufficientLicenseLevel}>{content}</EuiToolTip>;
  }

  return (
    <EuiFlexItem grow={false} key={item.id}>
      {content}
    </EuiFlexItem>
  );
};
