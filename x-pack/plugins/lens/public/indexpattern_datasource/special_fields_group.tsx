/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './datapanel.scss';
import React, { memo, useContext } from 'react';
import { DragContext } from '../drag_drop';
import { FieldItem } from './field_item';

export const SpecialFieldsGroup = memo(function SpecialFieldsGroup({
  fields,
  fieldProps,
  exists,
  dropOntoWorkspace,
  hasSuggestionForField,
}: FieldsAccordionProps) {
  const dragDropContext = useContext(DragContext);
  return fields.map((field, index) => {
    return (
      <FieldItem
        key={field.name}
        {...fieldProps}
        exists={exists(field)}
        field={field}
        hideDetails={true}
        groupIndex={0}
        itemIndex={index}
        dropOntoWorkspace={dropOntoWorkspace}
        hasSuggestionForField={hasSuggestionForField}
        dragDropContext={dragDropContext}
      />
    );
  });
});
