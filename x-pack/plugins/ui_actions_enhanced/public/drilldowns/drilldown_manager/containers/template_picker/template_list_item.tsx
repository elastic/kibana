/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as React from 'react';
import { DrilldownTemplate } from '../../types';

export interface TemplateListItemProps {
  template: DrilldownTemplate;
  onSelect: () => void;
}

export const TemplateListItem: React.FC<TemplateListItemProps> = ({ template, onSelect }) => {
  return <TemplateListItemUi name={template.name} onSelect={onSelect} />;
};

export interface TemplateListItemUiProps {
  name: string;
  description?: string;
  onSelect: () => void;
}

export const TemplateListItemUi: React.FC<TemplateListItemUiProps> = ({
  name,
  description,
  onSelect,
}) => {
  return (
    <div>
      <div>name: {name}</div>
      <button onClick={onSelect}>Clone</button>
    </div>
  );
};
