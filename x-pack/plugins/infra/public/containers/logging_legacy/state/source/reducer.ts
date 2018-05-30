/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const initialSourceState: SourceState = {
  coreFields: {
    message: '@message',
    tiebreaker: '_doc',
    time: '@timestamp',
  },
  indices: ['logstash-*'],
  name: 'Unnamed Source',
};

export interface SourceState {
  name: string;
  coreFields: {
    message: string;
    tiebreaker: string;
    time: string;
  };
  indices: string[];
}

export const sourceReducer = (
  state: SourceState = initialSourceState
): SourceState => state;
