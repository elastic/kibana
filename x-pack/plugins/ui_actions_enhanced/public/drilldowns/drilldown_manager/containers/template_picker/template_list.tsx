/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { DrilldownTemplate } from '../../types';
import { TemplateListItem } from './template_list_item';

export interface TemplateListProps {
  items: DrilldownTemplate[];
  onSelect: (index: number) => void;
}

export const TemplateList: React.FC<TemplateListProps> = ({ items, onSelect }) => {
  return (
    <>
      {items.map((template, index) => (
        <TemplateListItem key={index} template={template} onSelect={() => onSelect(index)} />
      ))}
    </>
  );
};
