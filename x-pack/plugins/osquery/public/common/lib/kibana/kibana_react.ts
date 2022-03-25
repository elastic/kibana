/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useHistory } from 'react-router-dom';
import { FieldIcon } from '@kbn/react-field';
import {
  KibanaContextProvider,
  KibanaReactContextValue,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
  reactRouterNavigate,
} from '../../../../../../../src/plugins/kibana_react/public';
import { StartServices } from '../../../types';

export type KibanaContext = KibanaReactContextValue<StartServices>;
export interface WithKibanaProps {
  kibana: KibanaContext;
}

const useTypedKibana = () => useKibana<StartServices>();

const isModifiedEvent = (event: React.MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: React.MouseEvent) => event.button === 0;

const useRouterNavigate = (
  to: Parameters<typeof reactRouterNavigate>[1],
  onClickCallback?: Parameters<typeof reactRouterNavigate>[2]
) => {
  const history = useHistory();
  return reactRouterNavigate(history, to, onClickCallback);
};

export {
  KibanaContextProvider,
  useRouterNavigate,
  isLeftClickEvent,
  isModifiedEvent,
  useTypedKibana as useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
  FieldIcon,
};
