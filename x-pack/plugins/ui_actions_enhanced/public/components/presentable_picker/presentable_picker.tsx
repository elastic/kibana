/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { PresentablePickerItem, Item } from './presentable_picker_item';

export type { Item } from './presentable_picker_item';

export interface PresentablePickerProps {
  items: Item[];
  context: unknown;
  onSelect: (itemId: string) => void;
}

export const TEST_SUBJ_ACTION_FACTORY_ITEM = 'actionFactoryItem';

// The below style is applied to fix Firefox rendering bug.
// See: https://github.com/elastic/kibana/pull/61219/#pullrequestreview-402903330
const firefoxBugFix = {
  willChange: 'opacity',
};

const sort = (f1: Item, f2: Item): number => f2.order - f1.order;

export const PresentablePicker: React.FC<PresentablePickerProps> = ({
  items,
  context,
  onSelect,
}) => {
  /**
   * Make sure items with incompatible license are at the end.
   */
  const itemsSorted = React.useMemo(() => {
    const compatible = items.filter((f) => f.isLicenseCompatible ?? true);
    const incompatible = items.filter((f) => !(f.isLicenseCompatible ?? true));
    return [...compatible.sort(sort), ...incompatible.sort(sort)];
  }, [items]);

  if (items.length === 0) {
    // This is not user facing, as it would be impossible to get into this state
    // just leaving for dev purposes for troubleshooting.
    return <div>No action factories to pick from.</div>;
  }

  return (
    <EuiFlexGroup gutterSize="m" responsive={false} wrap={true} style={firefoxBugFix}>
      {itemsSorted.map((item) => (
        <PresentablePickerItem key={item.id} item={item} context={context} onSelect={onSelect} />
      ))}
    </EuiFlexGroup>
  );
};
