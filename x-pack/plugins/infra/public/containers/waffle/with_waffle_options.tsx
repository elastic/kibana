/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createSelector } from 'reselect';

import {
  InfraMetricInput,
  InfraMetricType,
  InfraNodeType,
  InfraPathType,
} from '../../graphql/types';
import { InfraGroupByOptions } from '../../lib/lib';
import { State, waffleOptionsActions, waffleOptionsSelectors } from '../../store';
import { asChildFunctionRenderer } from '../../utils/typed_react';
import { bindPlainActionCreators } from '../../utils/typed_redux';
import { UrlStateContainer } from '../../utils/url_state';

const selectOptionsUrlState = createSelector(
  waffleOptionsSelectors.selectMetric,
  waffleOptionsSelectors.selectView,
  waffleOptionsSelectors.selectGroupBy,
  waffleOptionsSelectors.selectNodeType,
  waffleOptionsSelectors.selectCustomOptions,
  (metric, view, groupBy, nodeType, customOptions) => ({
    metric,
    groupBy,
    nodeType,
    view,
    customOptions,
  })
);

export const withWaffleOptions = connect(
  (state: State) => ({
    metric: waffleOptionsSelectors.selectMetric(state),
    groupBy: waffleOptionsSelectors.selectGroupBy(state),
    nodeType: waffleOptionsSelectors.selectNodeType(state),
    view: waffleOptionsSelectors.selectView(state),
    customOptions: waffleOptionsSelectors.selectCustomOptions(state),
    urlState: selectOptionsUrlState(state),
  }),
  bindPlainActionCreators({
    changeMetric: waffleOptionsActions.changeMetric,
    changeGroupBy: waffleOptionsActions.changeGroupBy,
    changeNodeType: waffleOptionsActions.changeNodeType,
    changeView: waffleOptionsActions.changeView,
    changeCustomOptions: waffleOptionsActions.changeCustomOptions,
  })
);

export const WithWaffleOptions = asChildFunctionRenderer(withWaffleOptions);

/**
 * Url State
 */

interface WaffleOptionsUrlState {
  metric?: ReturnType<typeof waffleOptionsSelectors.selectMetric>;
  groupBy?: ReturnType<typeof waffleOptionsSelectors.selectGroupBy>;
  nodeType?: ReturnType<typeof waffleOptionsSelectors.selectNodeType>;
  view?: ReturnType<typeof waffleOptionsSelectors.selectView>;
  customOptions?: ReturnType<typeof waffleOptionsSelectors.selectCustomOptions>;
}

export const WithWaffleOptionsUrlState = () => (
  <WithWaffleOptions>
    {({
      changeMetric,
      urlState,
      changeGroupBy,
      changeNodeType,
      changeView,
      changeCustomOptions,
    }) => (
      <UrlStateContainer
        urlState={urlState}
        urlStateKey="waffleOptions"
        mapToUrlState={mapToUrlState}
        onChange={newUrlState => {
          if (newUrlState && newUrlState.metric) {
            changeMetric(newUrlState.metric);
          }
          if (newUrlState && newUrlState.groupBy) {
            changeGroupBy(newUrlState.groupBy);
          }
          if (newUrlState && newUrlState.nodeType) {
            changeNodeType(newUrlState.nodeType);
          }
          if (newUrlState && newUrlState.view) {
            changeView(newUrlState.view);
          }
          if (newUrlState && newUrlState.customOptions) {
            changeCustomOptions(newUrlState.customOptions);
          }
        }}
        onInitialize={initialUrlState => {
          if (initialUrlState && initialUrlState.metric) {
            changeMetric(initialUrlState.metric);
          }
          if (initialUrlState && initialUrlState.groupBy) {
            changeGroupBy(initialUrlState.groupBy);
          }
          if (initialUrlState && initialUrlState.nodeType) {
            changeNodeType(initialUrlState.nodeType);
          }
          if (initialUrlState && initialUrlState.view) {
            changeView(initialUrlState.view);
          }
          if (initialUrlState && initialUrlState.customOptions) {
            changeCustomOptions(initialUrlState.customOptions);
          }
        }}
      />
    )}
  </WithWaffleOptions>
);

const mapToUrlState = (value: any): WaffleOptionsUrlState | undefined =>
  value
    ? {
        metric: mapToMetricUrlState(value.metric),
        groupBy: mapToGroupByUrlState(value.groupBy),
        nodeType: mapToNodeTypeUrlState(value.nodeType),
        view: mapToViewUrlState(value.view),
        customOptions: mapToCustomOptionsUrlState(value.customOptions),
      }
    : undefined;

const isInfraMetricInput = (subject: any): subject is InfraMetricInput => {
  return subject != null && subject.type != null && InfraMetricType[subject.type] != null;
};

const isInfraPathInput = (subject: any): subject is InfraPathType => {
  return subject != null && subject.type != null && InfraPathType[subject.type] != null;
};

const isInfraGroupByOption = (subject: any): subject is InfraGroupByOptions => {
  return (
    subject != null &&
    subject.text != null &&
    subject.field != null &&
    InfraPathType[subject.type] != null
  );
};

const mapToMetricUrlState = (subject: any) => {
  return subject && isInfraMetricInput(subject) ? subject : undefined;
};

const mapToGroupByUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(isInfraPathInput) ? subject : undefined;
};

const mapToNodeTypeUrlState = (subject: any) => {
  return subject && InfraNodeType[subject] ? subject : undefined;
};

const mapToViewUrlState = (subject: any) => {
  return subject && ['map', 'table'].includes(subject) ? subject : undefined;
};

const mapToCustomOptionsUrlState = (subject: any) => {
  return subject && Array.isArray(subject) && subject.every(isInfraGroupByOption)
    ? subject
    : undefined;
};
