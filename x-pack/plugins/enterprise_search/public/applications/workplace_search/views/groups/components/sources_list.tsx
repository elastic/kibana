/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { IContentSource } from 'workplace_search/types';

import { EuiFilterSelectItem } from '@elastic/eui';

import SourceOptionItem from './SourceOptionItem';

interface ISourcesListProps {
  contentSources: IContentSource[];
  filteredSources: string[];
  addFilteredSource(sourceId: string);
  removeFilteredSource(sourceId: string);
}

export const SourcesList: React.FC<ISourcesListProps> = ({
  contentSources,
  filteredSources,
  addFilteredSource,
  removeFilteredSource,
}) => {
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

  return <div className="euiFilterSelect__items">{sources}</div>;
};
