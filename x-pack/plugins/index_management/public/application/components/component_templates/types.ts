/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Ideally, we shouldn't depend on anything in index management that is
// outside of the components_templates directory
// We could consider creating shared types or duplicating the types here if
// the component_templates app were to move outside of index management
import {
  ComponentTemplateSerialized,
  ComponentTemplateDeserialized,
  ComponentTemplateListItem,
} from '../../../../common';

export { ComponentTemplateSerialized, ComponentTemplateDeserialized, ComponentTemplateListItem };
