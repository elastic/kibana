/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiDragDropContext, EuiDraggable, EuiDroppable, euiDragDropReorder } from '@elastic/eui';

import { ComponentTemplateListItem } from '../../../../../common';
import {
  ComponentTemplatesListItem,
  Props as ComponentTemplatesListItemProps,
} from './component_templates_list_item';

interface DraggableLocation {
  droppableId: string;
  index: number;
}

interface Props {
  components: ComponentTemplateListItem[];
  onReorder: (components: ComponentTemplateListItem[]) => void;
  listItemProps: Omit<ComponentTemplatesListItemProps, 'component'>;
}

export const ComponentTemplatesSelection = ({ components, onReorder, listItemProps }: Props) => {
  const onDragEnd = ({
    source,
    destination,
  }: {
    source?: DraggableLocation;
    destination?: DraggableLocation;
  }) => {
    if (source && destination) {
      const items = euiDragDropReorder(components, source.index, destination.index);
      onReorder(items);
    }
  };

  return (
    <EuiDragDropContext onDragEnd={onDragEnd}>
      <EuiDroppable droppableId="componentTemplates" spacing="none">
        {components.map((component, idx) => (
          <EuiDraggable
            spacing="none"
            key={component.name}
            index={idx}
            draggableId={component.name}
            customDragHandle={true}
          >
            {(provided) => (
              <ComponentTemplatesListItem
                component={component}
                dragHandleProps={provided.dragHandleProps}
                {...listItemProps}
              />
            )}
          </EuiDraggable>
        ))}
      </EuiDroppable>
    </EuiDragDropContext>
  );
};
