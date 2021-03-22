/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import {
  DrilldownTemplateTable,
  DrilldownTemplateTableItem,
} from '../../components/drilldown_template_table';
import { DrilldownTemplate } from '../../types';
import { useDrilldownManager } from '../context';

export interface TemplateListProps {
  items: DrilldownTemplate[];
}

export const TemplateList: React.FC<TemplateListProps> = ({ items }) => {
  const drilldowns = useDrilldownManager();
  const tableItems: DrilldownTemplateTableItem[] = React.useMemo<
    DrilldownTemplateTableItem[]
  >(() => {
    return items.map((item) => {
      const tableItem: DrilldownTemplateTableItem = {
        id: item.id,
        name: item.name,
        icon: item.icon,
        description: item.description,
      };
      const factory = drilldowns.deps.actionFactories.find(({ id }) => id === item.factoryId);
      const trigger = drilldowns.deps.getTrigger(item.triggers[0]);

      if (factory) {
        const context = drilldowns.getActionFactoryContext();
        tableItem.actionName = factory.getDisplayName(context);
        tableItem.actionIcon = factory.getIconType(context);
      }
      if (trigger) {
        tableItem.trigger = trigger.title;
      }
      return tableItem;
    });
  }, [drilldowns, items]);

  return (
    <DrilldownTemplateTable
      items={tableItems}
      onCreate={drilldowns.onCreateFromTemplate}
      onClone={drilldowns.onClone}
    />
  );
};
