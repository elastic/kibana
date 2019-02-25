/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function filterPropertiesForTooltip(metricFields, properties) {
  const tooltipProps = {};
  metricFields.forEach((field) => {
    for (const key in properties) {
      if (properties.hasOwnProperty(key)) {
        if (field.propertyKey === key) {
          tooltipProps[field.propertyLabel] = properties[key];
        }
      }
    }
  });
  return tooltipProps;
}
