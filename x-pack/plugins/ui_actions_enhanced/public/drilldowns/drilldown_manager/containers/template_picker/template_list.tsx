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

export interface TemplateListProps {
  items: DrilldownTemplate[];
  onSelect: (index: number) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({ items, onSelect }) => {
  const tableItems: DrilldownTemplateTableItem[] = React.useMemo<
    DrilldownTemplateTableItem[]
  >(() => {
    return items.map((item, index) => ({
      id: String(index),
      name: item.name,
      description: item.description,
    }));
  }, [items]);

  return <DrilldownTemplateTable items={tableItems} onCreate={() => {}} />;
};
