/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type OriginInterpreterContext = OriginInterpreterTypeState['context'];

type DefaultOriginInterpreterContext = undefined;

export type OriginInterpreterEvent =
  | {
      type: 'INITIALIZED_WITH_NO_ORIGIN';
    }
  | {
      type: 'INITIALIZED_WITH_ONBOARDING_ORIGIN';
    };

export type OriginInterpreterTypeState =
  | {
      value: 'uninitialized';
      context: DefaultOriginInterpreterContext;
    }
  | {
      value: 'onboarding';
      context: DefaultOriginInterpreterContext;
    }
  | {
      value: 'done';
      context: DefaultOriginInterpreterContext;
    };
