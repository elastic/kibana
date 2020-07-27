/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ComponentTemplateListItem } from '../../../../../common';
import {
  ComponentTemplatesListItem,
  Props as ComponentTemplatesListItemProps,
} from './component_templates_list_item';

interface Props {
  components: ComponentTemplateListItem[];
  listItemProps: Omit<ComponentTemplatesListItemProps, 'component'>;
}

export const ComponentTemplatesList = ({ components, listItemProps }: Props) => {
  return (
    <>
      {components.map((component) => (
        <ComponentTemplatesListItem key={component.name} component={component} {...listItemProps} />
      ))}
    </>
  );
};
