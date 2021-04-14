/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SPAN_DESTINATION_SERVICE_RESOURCE } from '../../../../common/elasticsearch_fieldnames';
import { findCommonConnections } from './find_common_connections';
import { Connections } from './get_connections';

describe('findCommonConnections', () => {
  it("doesn't return connections when current and previous are empty", () => {
    const currentPeriodConnections = [] as Connections;
    const previousPeriodConnections = [] as Connections;

    expect(
      findCommonConnections({
        currentPeriodConnections,
        previousPeriodConnections,
      })
    ).toEqual([]);
  });
  it("doesn't return connections when current is empty", () => {
    const currentPeriodConnections = [] as Connections;
    const previousPeriodConnections = [
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-ruby' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-java' },
      },
    ] as Connections;

    expect(
      findCommonConnections({
        currentPeriodConnections,
        previousPeriodConnections,
      })
    ).toEqual([]);
  });
  it("doesn't return connections when there are no match", () => {
    const currentPeriodConnections = [
      { [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-python' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-dotnet' },
      },
    ] as Connections;
    const previousPeriodConnections = [
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-ruby' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-java' },
      },
    ] as Connections;

    expect(
      findCommonConnections({
        currentPeriodConnections,
        previousPeriodConnections,
      })
    ).toEqual([]);
  });
  it('returns connections without service name', () => {
    const currentPeriodConnections = [
      { [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-python' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-dotnet' },
      },
    ] as Connections;
    const previousPeriodConnections = [
      { [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-ruby' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-java' },
      },
    ] as Connections;

    expect(
      findCommonConnections({
        currentPeriodConnections,
        previousPeriodConnections,
      })
    ).toEqual([{ [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' }]);
  });
  it('returns common connections', () => {
    const currentPeriodConnections = [
      { [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-python' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-dotnet' },
      },
    ] as Connections;
    const previousPeriodConnections = [
      { [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-ruby' },
      },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-dotnet' },
      },
    ] as Connections;

    expect(
      findCommonConnections({
        currentPeriodConnections,
        previousPeriodConnections,
      })
    ).toEqual([
      { [SPAN_DESTINATION_SERVICE_RESOURCE]: 'postgresql' },
      {
        [SPAN_DESTINATION_SERVICE_RESOURCE]: 'opbeans:3000',
        service: { name: 'opbeans-dotnet' },
      },
    ]);
  });
});
