/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef, MouseEvent, KeyboardEvent, useMemo } from 'react';
import {
  EuiIcon,
  EuiText,
  EuiI18n,
  EuiScreenReaderOnly,
  EuiBadge,
  keys,
  EuiLoadingSpinner,
} from '@elastic/eui';
import {
  TREE_NAVIGATION_LOADING,
  TREE_NAVIGATION_SHOW_MORE,
} from '../../../../common/translations';
import { useFetchDynamicTreeView } from './hooks';
import { useStyles } from './styles';
import { disableEventDefaults, focusNextElement } from './helpers';
import type { DynamicTreeViewProps, DynamicTreeViewItemProps } from './types';

const focusNextButton = (event: KeyboardEvent) => {
  focusNextElement(event, '[data-test-subj="dynamicTreeViewButton"]', 'next');
};
const focusPreviousButton = (event: KeyboardEvent) => {
  focusNextElement(event, '[data-test-subj="dynamicTreeViewButton"]', 'prev');
};

const DynamicTreeViewExpander = ({
  children,
}: {
  children: (childrenProps: { isExpanded: boolean; onToggleExpand: () => void }) => JSX.Element;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const onToggleExpand = () => {
    setIsExpanded((e) => !e);
  };

  return children({
    isExpanded,
    onToggleExpand,
  });
};

export const DynamicTreeView = ({
  tree,
  depth = 0,
  selectionDepth = {},
  query,
  indexPattern = '',
  onSelect,
  hasSelection,
  selected = '',
  expanded = true,
  ...props
}: DynamicTreeViewProps) => {
  const styles = useStyles(depth);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } =
    useFetchDynamicTreeView(query, tree[depth].key, indexPattern, expanded);

  const ariaLabel = props['aria-label'];

  const onLoadMoreKeydown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case keys.ARROW_DOWN: {
        focusNextButton(event);
        break;
      }
      case keys.ARROW_UP: {
        focusPreviousButton(event);
        break;
      }
      case keys.ARROW_RIGHT: {
        disableEventDefaults(event);
        fetchNextPage();
      }
    }
  };

  useEffect(() => {
    if (expanded) {
      fetchNextPage();
    }
  }, [fetchNextPage, expanded]);

  useEffect(() => {
    if (!hasSelection && !depth && data && data.pages?.[0].buckets?.[0]?.key) {
      onSelect({}, data.pages[0].buckets[0].key, tree[depth].type);
    }
  }, [data, depth, hasSelection, onSelect, tree]);

  const onClickNextPageHandler = () => {
    fetchNextPage();
  };

  return (
    <EuiText
      size="s"
      className={`euiTreeView__wrapper ${!expanded ? 'euiTreeView__wrapper--hidden' : ''}`}
      css={styles.treeViewWrapper(expanded)}
    >
      {isLoading && (
        <div>
          <EuiLoadingSpinner size="s" />
          <span css={styles.loadMoreTextLeft}>{TREE_NAVIGATION_LOADING}</span>
        </div>
      )}
      {depth === 0 && (
        <EuiI18n
          token="euiTreeView.listNavigationInstructions"
          default="You can quickly navigate this list using arrow keys."
        >
          {(listNavigationInstructions: string) => (
            <EuiScreenReaderOnly>
              <p id="dynamicTreeViewInstructionId">{listNavigationInstructions}</p>
            </EuiScreenReaderOnly>
          )}
        </EuiI18n>
      )}
      <ul
        className="euiTreeView"
        aria-describedby={data?.pages?.length ? 'dynamicTreeViewInstructionId' : undefined}
        aria-label={ariaLabel}
      >
        {data?.pages?.map((aggsData) => {
          return aggsData?.buckets.map((aggData) => {
            const queryFilter = {
              ...query,
              bool: {
                ...query.bool,
                filter: [...query.bool.filter, { term: { [tree[depth].key]: aggData.key } }],
              },
            };

            return (
              <DynamicTreeViewExpander key={aggData.key}>
                {({ isExpanded, onToggleExpand }) => (
                  <DynamicTreeViewItem
                    aggData={aggData}
                    aria-label={ariaLabel}
                    depth={depth}
                    expanded={expanded}
                    indexPattern={indexPattern}
                    isExpanded={isExpanded}
                    onSelect={onSelect}
                    onToggleExpand={onToggleExpand}
                    query={queryFilter}
                    selected={selected}
                    selectionDepth={selectionDepth}
                    tree={tree}
                  />
                )}
              </DynamicTreeViewExpander>
            );
          });
        })}
        {hasNextPage && (
          <li key="load_more" className="euiTreeView__node" css={styles.loadMoreButtonWrapper}>
            <EuiBadge
              css={styles.loadMoreButton}
              onClickAriaLabel={TREE_NAVIGATION_SHOW_MORE(tree[depth].namePlural)}
              data-test-subj="dynamicTreeViewButton"
              onKeyDown={(event: React.KeyboardEvent) => onLoadMoreKeydown(event)}
              onClick={onClickNextPageHandler}
            >
              <span css={styles.loadMoreText}>
                {isFetchingNextPage
                  ? TREE_NAVIGATION_LOADING
                  : TREE_NAVIGATION_SHOW_MORE(tree[depth].namePlural)}
              </span>
              {isFetchingNextPage ? (
                <EuiLoadingSpinner size="s" />
              ) : (
                <EuiIcon size="s" type="arrowDown" />
              )}
            </EuiBadge>
          </li>
        )}
      </ul>
    </EuiText>
  );
};

const DynamicTreeViewItem = ({
  depth,
  tree,
  onToggleExpand,
  onSelect,
  aggData,
  selectionDepth,
  isExpanded,
  selected,
  expanded,
  query,
  indexPattern,
  ...props
}: DynamicTreeViewItemProps) => {
  const isLastNode = depth === tree.length - 1;
  const styles = useStyles(depth);
  const buttonRef = useRef<Record<string, any>>({});

  const onKeyboardToggle = () => {
    if (!isLastNode) {
      onToggleExpand();
    }
    onSelect(selectionDepth, aggData.key, tree[depth].type);
  };

  const onButtonToggle = () => {
    if (!isLastNode && !isExpanded) {
      onToggleExpand();
    }
    onSelect(selectionDepth, aggData.key, tree[depth].type);
  };

  const onArrowToggle = (event: MouseEvent<SVGElement>) => {
    disableEventDefaults(event);
    if (!isLastNode) {
      onToggleExpand();
    }
  };

  // Enable keyboard navigation
  const onKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case keys.ARROW_DOWN: {
        focusNextButton(event);
        break;
      }
      case keys.ARROW_UP: {
        focusPreviousButton(event);
        break;
      }
      case keys.ARROW_RIGHT: {
        if (!isExpanded && !isLastNode) {
          disableEventDefaults(event);
          onKeyboardToggle();
        }
        break;
      }
      case keys.ARROW_LEFT: {
        if (isExpanded) {
          disableEventDefaults(event);
          onKeyboardToggle();
        }
      }
      default:
        break;
    }
  };

  const onChildrenKeydown = (event: React.KeyboardEvent, key: string) => {
    if (event.key === keys.ARROW_LEFT) {
      disableEventDefaults(event);
      buttonRef.current[key].focus();
    }
  };

  const isSelected = useMemo(() => {
    return (
      selected ===
      Object.entries({ ...selectionDepth, [tree[depth].type]: aggData.key })
        .map(([k, v]) => `${k}.${v}`)
        .join()
    );
  }, [aggData.key, depth, selected, selectionDepth, tree]);

  return (
    <li
      className={`euiTreeView__node
        ${isExpanded ? 'euiTreeView__node--expanded' : ''}
        ${isSelected ? 'euiTreeView__node--selected' : ''}
      `}
      data-test-subj={`${isSelected ? 'euiTreeView__node--selected' : ''}`}
    >
      <button
        data-test-subj={`dynamicTreeViewButton${!expanded ? 'Hidden' : ''}`}
        className="euiTreeView__nodeInner euiTreeView__nodeInner--withArrows"
        onClick={onButtonToggle}
        onKeyDown={(event: React.KeyboardEvent) => onKeyDown(event)}
        ref={(el) => (buttonRef.current[aggData.key] = el)}
      >
        {!isLastNode && (
          <EuiIcon
            className="euiTreeView__expansionArrow"
            type={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={onArrowToggle}
          />
        )}
        <EuiIcon {...tree[depth].iconProps} css={styles.labelIcon} />
        <span className="euiTreeView__nodeLabel">{aggData.key}</span>
      </button>
      <div
        onKeyDown={(event: React.KeyboardEvent) => onChildrenKeydown(event, aggData.key.toString())}
      >
        {!isLastNode && (
          <DynamicTreeView
            expanded={isExpanded}
            query={query}
            depth={depth + 1}
            selectionDepth={{
              ...selectionDepth,
              [tree[depth].type]: aggData.key,
            }}
            tree={tree}
            indexPattern={indexPattern}
            onSelect={onSelect}
            selected={selected}
            aria-label={`${aggData.key} child of ${props['aria-label']}`}
          />
        )}
      </div>
    </li>
  );
};
