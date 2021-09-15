/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, memo, useCallback, useMemo } from 'react';
import {
  AnyArtifact,
  ArtifactEntryCollapsableCard,
  ArtifactEntryCollapsableCardProps,
} from '../artifact_entry_card';
import { PaginatedContent as _PaginatedContent, PaginatedContentProps } from '../paginated_content';
import { GridHeader } from './components/grid_header';

type ArtifactsPaginatedContentProps = PaginatedContentProps<
  AnyArtifact,
  typeof ArtifactEntryCollapsableCard
>;

type ArtifactsPaginatedComponent = ComponentType<ArtifactsPaginatedContentProps>;

const PaginatedContent: ArtifactsPaginatedComponent = _PaginatedContent;

export type ArtifactCardGridProps = Omit<
  ArtifactsPaginatedContentProps,
  'ItemComponent' | 'itemComponentProps' | 'items' | 'onChange'
> & {
  items: AnyArtifact[];

  onPageChange: ArtifactsPaginatedContentProps['onChange'];

  onExpandCollapse: (/* TODO:PT defined structure for props */) => void;

  /**
   * Callback to provide additional props for the `ArtifactEntryCollapsableCard`
   *
   * @param item
   */
  cardComponentProps?: (
    item: AnyArtifact
  ) => Omit<ArtifactEntryCollapsableCardProps, 'onExpandCollapse' | 'item'>;
};

export const ArtifactCardGrid = memo<ArtifactCardGridProps>(
  ({ items, cardComponentProps, onPageChange, onExpandCollapse, ...paginatedContentProps }) => {
    const handleCardExpandCollapse = useCallback(() => {}, []);

    const cardPropsById = useMemo<Record<string, ArtifactEntryCollapsableCardProps>>(() => {
      return items.reduce<Record<string, ArtifactEntryCollapsableCardProps>>((cardsProps, item) => {
        cardsProps[item.id] = {
          ...(cardComponentProps ? cardComponentProps(item) : {}),
          item,
          onExpandCollapse: () => {
            handleCardExpandCollapse();
          },
        };

        return cardsProps;
      }, {});
    }, [cardComponentProps, handleCardExpandCollapse, items]);

    const handleItemComponentProps = useCallback(
      (item: AnyArtifact): ArtifactEntryCollapsableCardProps => {
        return cardPropsById[item.id];
      },
      [cardPropsById]
    );

    return (
      <>
        <GridHeader />

        <PaginatedContent
          {...paginatedContentProps}
          items={items}
          ItemComponent={ArtifactEntryCollapsableCard}
          itemComponentProps={handleItemComponentProps}
          onChange={onPageChange}
        />
      </>
    );
  }
);
ArtifactCardGrid.displayName = 'ArtifactCardGrid';
