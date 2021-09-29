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
import { MaybeImmutable } from '../../../../common/endpoint/types';

const PaginatedContent: ArtifactsPaginatedComponent = _PaginatedContent;

type ArtifactsPaginatedContentProps = PaginatedContentProps<
  AnyArtifact,
  typeof ArtifactEntryCollapsableCard
>;

type ArtifactsPaginatedComponent = ComponentType<ArtifactsPaginatedContentProps>;

interface CardExpandCollapseState {
  expanded: MaybeImmutable<AnyArtifact[]>;
  collapsed: MaybeImmutable<AnyArtifact[]>;
}

export type ArtifactCardGridCardComponentProps = Omit<
  ArtifactEntryCollapsableCardProps,
  'onExpandCollapse' | 'item'
>;
export type ArtifactCardGridProps = Omit<
  ArtifactsPaginatedContentProps,
  'ItemComponent' | 'itemComponentProps' | 'items' | 'onChange'
> & {
  items: MaybeImmutable<AnyArtifact[]>;

  onPageChange: ArtifactsPaginatedContentProps['onChange'];

  onExpandCollapse: (state: CardExpandCollapseState) => void;

  /**
   * Callback to provide additional props for the `ArtifactEntryCollapsableCard`
   *
   * @param item
   */
  cardComponentProps?: (item: MaybeImmutable<AnyArtifact>) => ArtifactCardGridCardComponentProps;
};

export const ArtifactCardGrid = memo<ArtifactCardGridProps>(
  ({
    items: _items,
    cardComponentProps,
    onPageChange,
    onExpandCollapse,
    ...paginatedContentProps
  }) => {
    const items = _items as AnyArtifact[];

    // The list of card props that the caller can define
    type PartialCardProps = Map<AnyArtifact, ArtifactCardGridCardComponentProps>;
    const callerDefinedCardProps = useMemo<PartialCardProps>(() => {
      const cardProps: PartialCardProps = new Map();

      for (const artifact of items) {
        cardProps.set(artifact, cardComponentProps ? cardComponentProps(artifact) : {});
      }

      return cardProps;
    }, [cardComponentProps, items]);

    // Handling of what is expanded or collapsed is done by looking at the at what the caller card's
    // `expanded` prop value was and then invert it for the card that the user clicked expand/collapse
    const handleCardExpandCollapse = useCallback(
      (item: AnyArtifact) => {
        const expanded = [];
        const collapsed = [];

        for (const [artifact, currentCardProps] of callerDefinedCardProps) {
          const currentExpandedState = Boolean(currentCardProps.expanded);
          const newExpandedState = artifact === item ? !currentExpandedState : currentExpandedState;

          if (newExpandedState) {
            expanded.push(artifact);
          } else {
            collapsed.push(artifact);
          }
        }

        onExpandCollapse({ expanded, collapsed });
      },
      [callerDefinedCardProps, onExpandCollapse]
    );

    // Full list of card props that includes the actual artifact and the callbacks
    type FullCardProps = Map<AnyArtifact, ArtifactEntryCollapsableCardProps>;
    const fullCardProps = useMemo<FullCardProps>(() => {
      const newFullCardProps: FullCardProps = new Map();

      for (const [artifact, cardProps] of callerDefinedCardProps) {
        newFullCardProps.set(artifact, {
          ...cardProps,
          item: artifact,
          onExpandCollapse: () => handleCardExpandCollapse(artifact),
        });
      }

      return newFullCardProps;
    }, [callerDefinedCardProps, handleCardExpandCollapse]);

    const handleItemComponentProps = useCallback(
      (item: AnyArtifact): ArtifactEntryCollapsableCardProps => {
        return fullCardProps.get(item)!;
      },
      [fullCardProps]
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
