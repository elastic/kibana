/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Pipeline } from '../../../../common/types';

export type ReadProcessorsFunction = () => Pick<Pipeline, 'processors' | 'on_failure'>;

export type PipelineForm = Omit<Pipeline, 'processors' | 'on_failure'>;
