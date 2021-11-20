/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Location } from 'history';
import { Redirect, useLocation, RouteComponentProps } from 'react-router-dom';

/**
 * Function that returns a react component to redirect to a given pathname removing hash-based URLs
 * @param pathname
 */
export function redirectTo(pathname: string) {
  return ({ location }: RouteComponentProps<{}>) => {
    return <RenderRedirectTo location={location} pathname={pathname} />;
  };
}

/**
 * React component to redirect to a given pathname removing hash-based URLs
 * @param param0
 */
export function RedirectTo({ pathname }: { pathname: string }) {
  const location = useLocation();
  return <RenderRedirectTo location={location} pathname={pathname} />;
}

interface Props {
  location: Location;
  pathname: string;
}

/**
 * Given a pathname, redirect to that location, preserving the search and maintaining
 * backward-compatibilty with legacy (pre-7.9) hash-based URLs.
 */
function RenderRedirectTo(props: Props) {
  const { location } = props;
  let search = location.search;
  let pathname = props.pathname;

  // Redirect root URLs with a hash to support backward compatibility with URLs
  // from before we switched to the non-hash platform history.
  if (location.pathname === '' && location.hash.length > 0) {
    // We just want the search and pathname so the host doesn't matter
    const resolvedUrl = new URL(location.hash.slice(1), 'http://localhost');
    search = resolvedUrl.search;
    pathname = resolvedUrl.pathname;
  }

  return <Redirect to={{ ...location, hash: '', pathname, search }} />;
}
