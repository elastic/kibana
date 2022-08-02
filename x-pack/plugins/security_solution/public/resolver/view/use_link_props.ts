/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useSelector } from 'react-redux';
import type { MouseEventHandler } from 'react';
import { useNavigateOrReplace } from './use_navigate_or_replace';

import * as selectors from '../store/selectors';
import type { PanelViewAndParameters, ResolverState } from '../types';

type EventHandlerCallback = MouseEventHandler<HTMLButtonElement | HTMLAnchorElement>;

/**
 * Get an `onClick` function and an `href` string. Use these as props for `<a />` elements.
 * `onClick` will use navigate to the `panelViewAndParameters` using `history.push`.
 * the `href` points to `panelViewAndParameters`.
 * Existing `search` parameters are maintained.
 */
export function useLinkProps(panelViewAndParameters: PanelViewAndParameters): {
  href: string;
  onClick: EventHandlerCallback;
} {
  const search = useSelector((state: ResolverState) =>
    selectors.relativeHref(state)(panelViewAndParameters)
  );

  return useNavigateOrReplace({
    search,
  });
}
