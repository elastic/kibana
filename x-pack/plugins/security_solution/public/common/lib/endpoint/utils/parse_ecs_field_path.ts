/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Parses a ECS field path (ex. `host.os.name`) into an object that contains the `category` and
 * `field` value. Good for using when wanting to search for items in `TimelineEventsDetailsItem`
 * @param field
 */
export const parseEcsFieldPath = (field: string): { category: string; field: string } => {
  const result = { category: '', field };

  if (field.includes('.')) {
    result.category = field.substring(0, field.indexOf('.'));
  }

  return result;
};
