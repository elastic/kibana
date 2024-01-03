/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withKibana } from '@kbn/kibana-react-plugin/public';

import { AssistantProvider as AssistantProviderWithoutKibanaServices } from './provider';
const AssistantProvider = withKibana(AssistantProviderWithoutKibanaServices);

// Export default for lazy imports
// eslint-disable-next-line import/no-default-export
export default AssistantProvider;
