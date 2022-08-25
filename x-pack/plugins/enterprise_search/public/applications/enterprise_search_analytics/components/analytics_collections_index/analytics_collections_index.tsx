/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { useActions, useValues } from 'kea';

import { AnalyticsCollectionsLogic } from './analytics_collections_logic';

export const AnalyticsCollectionsIndex = () => {
  const { fetchAnalyticsCollections } = useActions(AnalyticsCollectionsLogic);
  const { analyticsCollections, isLoading, hasNoAnalyticsCollections } =
    useValues(AnalyticsCollectionsLogic);

  useEffect(() => {
    fetchAnalyticsCollections();
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (hasNoAnalyticsCollections) {
    return <div>you have no collections</div>;
  }

  return (
    <div>
      {analyticsCollections.map(({ name }) => {
        return <div>{name}</div>;
      })}
    </div>
  );
};
