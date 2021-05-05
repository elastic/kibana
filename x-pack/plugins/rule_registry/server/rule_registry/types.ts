/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Mappings {
  dynamic: 'strict' | boolean;
  properties: Record<string, { type: string } | Mappings>;
}

enum ILMPolicyPhase {
  hot = 'hot',
  delete = 'delete',
}

enum ILMPolicyAction {
  rollover = 'rollover',
  delete = 'delete',
}

interface ILMActionOptions {
  [ILMPolicyAction.rollover]: {
    max_size: string;
    max_age: string;
  };
  [ILMPolicyAction.delete]: {};
}

export interface ILMPolicy {
  policy: {
    phases: Record<
      ILMPolicyPhase,
      {
        actions: {
          [key in keyof ILMActionOptions]?: ILMActionOptions[key];
        };
      }
    >;
  };
}
