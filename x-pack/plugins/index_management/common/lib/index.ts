/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export { deserializeDataStream, deserializeDataStreamList } from './data_stream_serialization';

export {
  deserializeTemplate,
  deserializeTemplateList,
  deserializeLegacyTemplate,
  deserializeLegacyTemplateList,
  serializeTemplate,
  serializeLegacyTemplate,
} from './template_serialization';

export { getTemplateParameter } from './utils';

export {
  deserializeComponentTemplate,
  deserializeComponentTemplateList,
  serializeComponentTemplate,
} from './component_template_serialization';
