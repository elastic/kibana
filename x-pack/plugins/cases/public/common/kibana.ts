/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useKibana } from '../../../../../src/plugins/kibana_react/public/context';
import { StartServices } from '../types';

const useTypedKibana = () => useKibana<StartServices>();

export { useTypedKibana as useKibana };
