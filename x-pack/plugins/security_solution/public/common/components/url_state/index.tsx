/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { connect } from 'react-redux';
import deepEqual from 'fast-deep-equal';

import { useRouteSpy } from '../../utils/route/use_route_spy';

import { UrlStateContainerPropTypes, UrlStateProps, UrlStateStateToPropsType } from './types';
import { useUrlStateHooks } from './use_url_state';
import { makeMapStateToProps } from './helpers';

export const UseUrlStateMemo = React.memo(
  function UrlState(props: UrlStateContainerPropTypes) {
    useUrlStateHooks(props);
    return null;
  },
  (prevProps, nextProps) =>
    prevProps.pathName === nextProps.pathName &&
    deepEqual(prevProps.urlState, nextProps.urlState) &&
    deepEqual(prevProps.indexPattern, nextProps.indexPattern) &&
    prevProps.search === nextProps.search &&
    deepEqual(prevProps.navTabs, nextProps.navTabs)
);

export const UseUrlStateComponent: React.FC<UrlStateProps & UrlStateStateToPropsType> = (props) => {
  const [routeProps] = useRouteSpy();

  return (
    <UseUrlStateMemo
      {...{
        ...routeProps,
        ...props,
      }}
    />
  );
};

export const UseUrlState = connect(makeMapStateToProps)(UseUrlStateComponent);
