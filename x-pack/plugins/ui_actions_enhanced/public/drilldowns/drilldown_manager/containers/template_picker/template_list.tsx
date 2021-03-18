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
import { StartFromTemplate } from './start_from_template';

export interface TemplateListProps {
  items: DrilldownTemplate[];
}

export const TemplateList: React.FC<TemplateListProps> = ({ items }) => {
  const drilldowns = useDrilldownManager();
  const tableItems: DrilldownTemplateTableItem[] = React.useMemo<
    DrilldownTemplateTableItem[]
  >(() => {
    return items.map((item) => ({
      id: item.id,
      name: item.name,
      icon: item.icon,
      description: item.description,
    }));
  }, [items]);

  return (
    <StartFromTemplate>
      <DrilldownTemplateTable
        items={tableItems}
        onCreate={drilldowns.onCreateFromTemplate}
        onClone={drilldowns.onClone}
      />
    </StartFromTemplate>
  );
};
