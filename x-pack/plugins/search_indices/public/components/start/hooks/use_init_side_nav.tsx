/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';

import type { IndicesStatusResponse } from '../../../../common';

import { useKibana } from '../../../hooks/use_kibana';

/* useInitSideNav Hook checks if the sidenav is collapsed, and collapses it if
 * we're going to show the empty state. */
export const useInitSideNav = (indicesStatus?: IndicesStatusResponse) => {
  const [collapsedSideNav, setCollapsedSideNav] = useState<boolean>(false);
  const {
    chrome: { sideNav },
  } = useKibana().services;
  const isSideNavCollapsed = useObservable(sideNav.getIsCollapsed$());
  useEffect(() => {
    if (!collapsedSideNav && isSideNavCollapsed === true) {
      // if the side nav is collapsed, but we haven't auto-collapsed, flip our
      // flag anyway to allow user to un-collapse on first click.
      setCollapsedSideNav(true);
      return;
    }
    if (
      isSideNavCollapsed ||
      collapsedSideNav ||
      !indicesStatus ||
      indicesStatus.indexNames.length > 0
    ) {
      return;
    }
    sideNav.setIsCollapsed(true);
    // track if we've auto-collapsed the side nav so that this doesn't
    // keep collapsing the side-nav
    setCollapsedSideNav(true);
  }, [collapsedSideNav, indicesStatus, isSideNavCollapsed, sideNav]);
};
