/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
export {
  deserializeTemplateV1List,
  deserializeTemplateV2List,
  deserializeV1Template,
  serializeV1Template,
} from './template_serialization';

export { getTemplateParameter } from './utils';
