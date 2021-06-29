/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ActionFactory, BaseActionFactoryContext } from '../../dynamic_actions';
import { PresentablePicker, Item } from '../presentable_picker';

export interface ActionFactoryPickerProps {
  actionFactories: ActionFactory[];
  context: unknown;
  onSelect: (actionFactory: ActionFactory) => void;
}

export const ActionFactoryPicker: React.FC<ActionFactoryPickerProps> = ({
  actionFactories,
  context,
  onSelect,
}) => {
  const items = React.useMemo(() => {
    return actionFactories.map((actionFactory) => {
      const item: Item = {
        id: actionFactory.id,
        order: actionFactory.order,
        getDisplayName: (ctx: unknown) =>
          actionFactory.getDisplayName(ctx as BaseActionFactoryContext),
        getIconType: (ctx: unknown) => actionFactory.getIconType(ctx as BaseActionFactoryContext),
        getDisplayNameTooltip: () => '',
        isCompatible: (ctx: unknown) => actionFactory.isCompatible(ctx as BaseActionFactoryContext),
        MenuItem: actionFactory.MenuItem,
        isBeta: actionFactory.isBeta,
        isLicenseCompatible: actionFactory.isCompatibleLicense(),
      };
      return item;
    });
  }, [actionFactories]);

  const handleSelect = React.useCallback(
    (id: string) => {
      if (!onSelect) return;
      const actionFactory = actionFactories.find((af) => af.id === id);
      if (!actionFactory) return;
      onSelect(actionFactory);
    },
    [onSelect, actionFactories]
  );

  return <PresentablePicker items={items} context={context} onSelect={handleSelect} />;
};
