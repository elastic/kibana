/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ComponentType, memo, useCallback, useMemo } from 'react';
import {
  AnyArtifact,
  ArtifactEntryCollapsibleCard,
  ArtifactEntryCollapsibleCardProps,
} from '../artifact_entry_card';
import { PaginatedContent as _PaginatedContent, PaginatedContentProps } from '../paginated_content';
import { GridHeader } from './components/grid_header';
import { MaybeImmutable } from '../../../../common/endpoint/types';
import { useTestIdGenerator } from '../hooks/use_test_id_generator';

const PaginatedContent: ArtifactsPaginatedComponent = _PaginatedContent;

type ArtifactsPaginatedContentProps = PaginatedContentProps<
  AnyArtifact,
  typeof ArtifactEntryCollapsibleCard
>;

type ArtifactsPaginatedComponent = ComponentType<ArtifactsPaginatedContentProps>;

interface CardExpandCollapseState {
  expanded: MaybeImmutable<AnyArtifact[]>;
  collapsed: MaybeImmutable<AnyArtifact[]>;
}

export type ArtifactCardGridCardComponentProps = Omit<
  ArtifactEntryCollapsibleCardProps,
  'onExpandCollapse' | 'item'
>;
export type ArtifactCardGridProps = Omit<
  ArtifactsPaginatedContentProps,
  'ItemComponent' | 'itemComponentProps' | 'items' | 'onChange'
> & {
  items: MaybeImmutable<AnyArtifact[]>;

  /** Callback to handle pagination changes */
  onPageChange: ArtifactsPaginatedContentProps['onChange'];

  /** callback for handling changes to the card's expand/collapse state */
  onExpandCollapse: (state: CardExpandCollapseState) => void;

  /**
   * Callback to provide additional props for the `ArtifactEntryCollapsibleCard`
   */
  cardComponentProps?: (item: MaybeImmutable<AnyArtifact>) => ArtifactCardGridCardComponentProps;
};

export const ArtifactCardGrid = memo<ArtifactCardGridProps>(
  ({
    items: _items,
    cardComponentProps,
    onPageChange,
    onExpandCollapse,
    'data-test-subj': dataTestSubj,
    ...paginatedContentProps
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);

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

    const isEverythingExpanded = useMemo(() => {
      for (const [_, currentCardProps] of callerDefinedCardProps) {
        const currentExpandedState = Boolean(currentCardProps.expanded);
        if (!currentExpandedState) {
          return false;
        }
      }
      return true;
    }, [callerDefinedCardProps]);

    const handleCardExpandCollapseAll = useCallback(() => {
      let expanded: AnyArtifact[] = [];
      let collapsed: AnyArtifact[] = [];

      if (!isEverythingExpanded) {
        expanded = Array.from(callerDefinedCardProps.keys());
      } else {
        collapsed = Array.from(callerDefinedCardProps.keys());
      }

      onExpandCollapse({ expanded, collapsed });
    }, [callerDefinedCardProps, onExpandCollapse, isEverythingExpanded]);

    // Full list of card props that includes the actual artifact and the callbacks
    type FullCardProps = Map<AnyArtifact, ArtifactEntryCollapsibleCardProps>;
    const fullCardProps = useMemo<FullCardProps>(() => {
      const newFullCardProps: FullCardProps = new Map();

      for (const [artifact, cardProps] of callerDefinedCardProps) {
        newFullCardProps.set(artifact, {
          ...cardProps,
          item: artifact,
          onExpandCollapse: () => handleCardExpandCollapse(artifact),
          'data-test-subj': cardProps['data-test-subj'] ?? getTestId('card'),
        });
      }

      return newFullCardProps;
    }, [callerDefinedCardProps, getTestId, handleCardExpandCollapse]);

    const handleItemComponentProps = useCallback(
      (item: AnyArtifact): ArtifactEntryCollapsibleCardProps => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return fullCardProps.get(item)!;
      },
      [fullCardProps]
    );

    return (
      <>
        <GridHeader
          expandAllIconType={isEverythingExpanded ? 'fold' : 'unfold'}
          onExpandCollapseAll={handleCardExpandCollapseAll}
          data-test-subj={getTestId('header')}
        />

        <PaginatedContent
          {...paginatedContentProps}
          data-test-subj={dataTestSubj}
          items={items}
          ItemComponent={ArtifactEntryCollapsibleCard}
          itemComponentProps={handleItemComponentProps}
          onChange={onPageChange}
        />
      </>
    );
  }
);
ArtifactCardGrid.displayName = 'ArtifactCardGrid';
