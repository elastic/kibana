/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import _ from 'lodash';
import { FeatureCollection } from 'geojson';
import { ESTermSourceDescriptor } from '../../../../common/descriptor_types';
import {
  AGG_TYPE,
  FEATURE_VISIBLE_PROPERTY_NAME,
  SOURCE_TYPES,
} from '../../../../common/constants';
import { performInnerJoins } from './perform_inner_joins';
import { InnerJoin } from '../../joins/inner_join';
import { IVectorSource } from '../../sources/vector_source';
import { IField } from '../../fields/field';

const LEFT_FIELD = 'leftKey';
const COUNT_PROPERTY_NAME = '__kbnjoin__count__d3625663-5b34-4d50-a784-0d743f676a0c';
const featureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        [FEATURE_VISIBLE_PROPERTY_NAME]: false,
        [LEFT_FIELD]: 'alpha',
      },
      geometry: {
        type: 'Point',
        coordinates: [-112, 46],
      },
    },
    {
      type: 'Feature',
      properties: {
        [COUNT_PROPERTY_NAME]: 20,
        [FEATURE_VISIBLE_PROPERTY_NAME]: true,
        [LEFT_FIELD]: 'bravo',
      },
      geometry: {
        type: 'Point',
        coordinates: [-100, 40],
      },
    },
  ],
};

const joinDescriptor = {
  leftField: LEFT_FIELD,
  right: {
    applyGlobalQuery: true,
    applyGlobalTime: true,
    id: 'd3625663-5b34-4d50-a784-0d743f676a0c',
    indexPatternId: 'myIndexPattern',
    metrics: [
      {
        type: AGG_TYPE.COUNT,
      },
    ],
    term: 'rightKey',
    type: SOURCE_TYPES.ES_TERM_SOURCE,
  } as ESTermSourceDescriptor,
};
const mockVectorSource = ({
  getInspectorAdapters: () => {
    return undefined;
  },
  createField: () => {
    return {
      getName: () => {
        return LEFT_FIELD;
      },
    } as IField;
  },
} as unknown) as IVectorSource;
const innerJoin = new InnerJoin(joinDescriptor, mockVectorSource);
const propertiesMap = new Map<string, Record<string | number, unknown>>();
propertiesMap.set('alpha', { [COUNT_PROPERTY_NAME]: 1 });

test('should skip join when no state has changed', () => {
  const updateSourceData = sinon.spy();
  const onJoinError = sinon.spy();

  performInnerJoins(
    {
      refreshed: false,
      featureCollection: _.cloneDeep(featureCollection) as FeatureCollection,
    },
    [
      {
        dataHasChanged: false,
        join: innerJoin,
      },
    ],
    updateSourceData,
    onJoinError
  );

  expect(updateSourceData.notCalled);
  expect(onJoinError.notCalled);
});

test('should perform join when features change', () => {
  const updateSourceData = sinon.spy();
  const onJoinError = sinon.spy();

  performInnerJoins(
    {
      refreshed: true,
      featureCollection: _.cloneDeep(featureCollection) as FeatureCollection,
    },
    [
      {
        dataHasChanged: false,
        join: innerJoin,
      },
    ],
    updateSourceData,
    onJoinError
  );

  expect(updateSourceData.calledOnce);
  expect(onJoinError.notCalled);
});

test('should perform join when join state changes', () => {
  const updateSourceData = sinon.spy();
  const onJoinError = sinon.spy();

  performInnerJoins(
    {
      refreshed: false,
      featureCollection: _.cloneDeep(featureCollection) as FeatureCollection,
    },
    [
      {
        dataHasChanged: true,
        join: innerJoin,
      },
    ],
    updateSourceData,
    onJoinError
  );

  expect(updateSourceData.calledOnce);
  expect(onJoinError.notCalled);
});

test('should call updateSourceData with feature collection with updated feature visibility and join properties', () => {
  const updateSourceData = sinon.spy();
  const onJoinError = sinon.spy();

  performInnerJoins(
    {
      refreshed: true,
      featureCollection: _.cloneDeep(featureCollection) as FeatureCollection,
    },
    [
      {
        dataHasChanged: false,
        join: innerJoin,
        propertiesMap,
      },
    ],
    updateSourceData,
    onJoinError
  );

  const firstCallArgs = updateSourceData.args[0];
  const updateSourceDataFeatureCollection = firstCallArgs[0];
  expect(updateSourceDataFeatureCollection).toEqual({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          [COUNT_PROPERTY_NAME]: 1,
          [FEATURE_VISIBLE_PROPERTY_NAME]: true,
          [LEFT_FIELD]: 'alpha',
        },
        geometry: {
          type: 'Point',
          coordinates: [-112, 46],
        },
      },
      {
        type: 'Feature',
        properties: {
          [FEATURE_VISIBLE_PROPERTY_NAME]: false,
          [LEFT_FIELD]: 'bravo',
        },
        geometry: {
          type: 'Point',
          coordinates: [-100, 40],
        },
      },
    ],
  });
  expect(onJoinError.notCalled);
});

test('should call updateSourceData when no results returned from terms aggregation', () => {
  const updateSourceData = sinon.spy();
  const onJoinError = sinon.spy();

  performInnerJoins(
    {
      refreshed: false,
      featureCollection: _.cloneDeep(featureCollection) as FeatureCollection,
    },
    [
      {
        dataHasChanged: true,
        join: innerJoin,
      },
    ],
    updateSourceData,
    onJoinError
  );

  const firstCallArgs = updateSourceData.args[0];
  const updateSourceDataFeatureCollection = firstCallArgs[0];
  expect(updateSourceDataFeatureCollection).toEqual({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          [FEATURE_VISIBLE_PROPERTY_NAME]: false,
          [LEFT_FIELD]: 'alpha',
        },
        geometry: {
          type: 'Point',
          coordinates: [-112, 46],
        },
      },
      {
        type: 'Feature',
        properties: {
          [COUNT_PROPERTY_NAME]: 20,
          [FEATURE_VISIBLE_PROPERTY_NAME]: false,
          [LEFT_FIELD]: 'bravo',
        },
        geometry: {
          type: 'Point',
          coordinates: [-100, 40],
        },
      },
    ],
  });
  expect(onJoinError.notCalled);
});

test('should call onJoinError when there are no matching features', () => {
  const updateSourceData = sinon.spy();
  const onJoinError = sinon.spy();

  // instead of returning military alphabet like "alpha" or "bravo", mismatched key returns numbers, like '1'
  const propertiesMapFromMismatchedKey = new Map<string, Record<string | number, unknown>>();
  propertiesMapFromMismatchedKey.set('1', { [COUNT_PROPERTY_NAME]: 1 });

  performInnerJoins(
    {
      refreshed: false,
      featureCollection: _.cloneDeep(featureCollection) as FeatureCollection,
    },
    [
      {
        dataHasChanged: true,
        join: innerJoin,
        propertiesMap: propertiesMapFromMismatchedKey,
      },
    ],
    updateSourceData,
    onJoinError
  );

  expect(updateSourceData.notCalled);
  expect(onJoinError.calledOnce);
});
