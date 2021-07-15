/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { useTrackPageview } from '../../../../observability/public';
import { APMRouteDefinition } from '../../application/routes';
import { redirectTo } from './redirect_to';

export function TelemetryWrapper({
  route,
  props,
}: {
  route: APMRouteDefinition;
  props: RouteComponentProps;
}) {
  const { component, render, path } = route;
  const pathAsString = path as string;

  useTrackPageview({ app: 'apm', path: pathAsString });
  useTrackPageview({ app: 'apm', path: pathAsString, delay: 15000 });

  if (component) {
    return React.createElement(component, props);
  }
  if (render) {
    return <>{render(props)}</>;
  }
  return <>{redirectTo('/')}</>;
}
