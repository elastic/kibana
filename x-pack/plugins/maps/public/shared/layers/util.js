/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */



export function filterPropertiesForTooltip(fields, properties) {
  const tooltipProps = {};
  fields.forEach((field) => {
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        if (field.name === key) {
          tooltipProps[field.label] = properties[key];
        }
      }
    }
  });

  console.log('ttp', tooltipProps);
  return tooltipProps;
}
