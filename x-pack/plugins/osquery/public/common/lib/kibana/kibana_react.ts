/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type React from 'react';
import type { Path } from 'react-router-dom-v5-compat';
import { useHistory } from 'react-router-dom';
import { useHref, parsePath } from 'react-router-dom-v5-compat';
import { FieldIcon } from '@kbn/react-field';
import type { KibanaReactContextValue, reactRouterNavigate } from '@kbn/kibana-react-plugin/public';
import {
  KibanaContextProvider,
  useKibana,
  useUiSetting,
  useUiSetting$,
  withKibana,
  reactRouterOnClickHandler,
} from '@kbn/kibana-react-plugin/public';
import type { StartServices } from '../../../types';

export type KibanaContext = KibanaReactContextValue<StartServices>;
export interface WithKibanaProps {
  kibana: KibanaContext;
}

const useTypedKibana = () => useKibana<StartServices>();

const isModifiedEvent = (event: React.MouseEvent) =>
  !!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey);

const isLeftClickEvent = (event: React.MouseEvent) => event.button === 0;

const toLocationObject = (to: string | Path) => (typeof to === 'string' ? parsePath(to) : to);

const useRouterNavigate = (
  to: Path | string,
  onClickCallback?: Parameters<typeof reactRouterNavigate>[2]
) => {
  const history = useHistory();

  return {
    href: useHref(toLocationObject(to)),
    onClick: reactRouterOnClickHandler(history.push, toLocationObject(to), onClickCallback),
  };
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
