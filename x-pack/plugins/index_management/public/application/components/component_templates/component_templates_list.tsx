/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { ComponentTemplateDeserialized } from '../../../../common';
import { ComponentTemplatesListItem } from './component_templates_list_item';

interface Props {
  components: ComponentTemplateDeserialized[];
}

export const ComponentTemplatesList = ({ components }: Props) => {
  return (
    <>
      {components.map(component => (
        <ComponentTemplatesListItem key={component.name} component={component} />
      ))}
    </>
  );
};
