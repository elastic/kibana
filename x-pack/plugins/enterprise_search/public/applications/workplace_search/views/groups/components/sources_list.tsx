/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFilterSelectItem, useEuiTheme } from '@elastic/eui';

import { ContentSource } from '../../../types';

import { SourceOptionItem } from './source_option_item';

interface SourcesListProps {
  contentSources: ContentSource[];
  filteredSources: string[];
  addFilteredSource(sourceId: string): void;
  removeFilteredSource(sourceId: string): void;
}

export const SourcesList: React.FC<SourcesListProps> = ({
  contentSources,
  filteredSources,
  addFilteredSource,
  removeFilteredSource,
}) => {
  const { euiTheme } = useEuiTheme();

  const sourceIds = contentSources.map(({ id }) => id);
  const sources = sourceIds.map((sourceId, index) => {
    const checked = filteredSources.indexOf(sourceId) > -1 ? 'on' : undefined;
    const handleClick = () =>
      checked ? removeFilteredSource(sourceId) : addFilteredSource(sourceId);
    return (
      <EuiFilterSelectItem key={index} checked={checked} onClick={handleClick}>
        <SourceOptionItem source={contentSources.filter(({ id }) => id === sourceId)[0]} />
      </EuiFilterSelectItem>
    );
  });

  return (
    // EUI NOTE: Please use EuiSelectable (which already has height/scrolling built in)
    // instead of EuiFilterSelectItem (which is pending deprecation).
    // @see https://elastic.github.io/eui/#/forms/filter-group#multi-select
    <div className="eui-yScroll" css={{ maxHeight: euiTheme.base * 30 }}>
      {sources}
    </div>
  );
};
