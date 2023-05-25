/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

export interface EngineNameProps {
  engineName: string;
}

export type EngineNameValues = EngineNameProps;

export interface EngineNameActions {
  setEngineName: (engineName: string) => { engineName: string };
}

export const EngineNameLogic = kea<
  MakeLogicType<EngineNameValues, EngineNameActions, EngineNameProps>
>({
  actions: {
    setEngineName: (engineName) => ({ engineName }),
  },
  path: ['enterprise_search', 'content', 'engine_name'],
  reducers: ({ props }) => ({
    engineName: [
      // Short-circuiting this to empty string is necessary to enable testing logics relying on this
      props.engineName ?? '',
      {
        setEngineName: (_, { engineName }) => engineName,
      },
    ],
  }),
});
