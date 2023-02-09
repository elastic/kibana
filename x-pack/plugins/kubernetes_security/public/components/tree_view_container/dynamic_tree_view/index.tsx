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
  EuiToolTip,
} from '@elastic/eui';
import {
  TREE_NAVIGATION_LOADING,
  TREE_NAVIGATION_SHOW_MORE,
} from '../../../../common/translations';
import { useFetchDynamicTreeView } from './hooks';
import { useStyles } from './styles';
import { disableEventDefaults, focusNextElement } from './helpers';
import { useTreeViewContext } from '../contexts';
import { TreeViewIcon } from '../tree_view_icon';
import type { DynamicTreeViewProps, DynamicTreeViewItemProps } from './types';
import { BREADCRUMBS_CLUSTER_TREE_VIEW_LEVELS } from '../translations';

const BUTTON_TEST_ID = 'kubernetesSecurity:dynamicTreeViewButton';

const focusNextButton = (event: KeyboardEvent) => {
  focusNextElement(event, `[data-test-subj="${BUTTON_TEST_ID}"]`, 'next');
};
const focusPreviousButton = (event: KeyboardEvent) => {
  focusNextElement(event, `[data-test-subj="${BUTTON_TEST_ID}"]`, 'prev');
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
  onSelect,
  selected = '',
  expanded = true,
  ...props
}: DynamicTreeViewProps) => {
  const styles = useStyles(depth);

  const { indexPattern, setNoResults } = useTreeViewContext();

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
    if (depth === 0 && data && data.pages?.[0].buckets.length === 0) {
      setNoResults(true);
    }
  }, [data, depth, setNoResults]);

  useEffect(() => {
    if (expanded) {
      fetchNextPage();
    }
  }, [fetchNextPage, expanded]);

  useEffect(() => {
    if (!selected && !depth && data && data.pages?.[0].buckets?.[0]?.key) {
      onSelect(
        {},
        tree[depth].type,
        data.pages[0].buckets[0].key,
        data.pages[0].buckets[0].key_as_string
      );
    }
  }, [data, depth, selected, onSelect, tree]);

  const onClickNextPageHandler = () => {
    fetchNextPage();
  };

  const itemList = useMemo(() => {
    return (
      data?.pages
        ?.map((aggsData) => {
          return aggsData?.buckets;
        })
        .flat() || []
    );
  }, [data?.pages]);

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
        {itemList.map((aggData) => {
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
        })}
        {hasNextPage && (
          <li key="load_more" className="euiTreeView__node" css={styles.loadMoreButtonWrapper}>
            <EuiBadge
              css={styles.loadMoreButton}
              onClickAriaLabel={TREE_NAVIGATION_SHOW_MORE(tree[depth].namePlural)}
              data-test-subj={BUTTON_TEST_ID}
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
  ...props
}: DynamicTreeViewItemProps) => {
  const isLastNode = depth === tree.length - 1;
  const styles = useStyles(depth);
  const buttonRef = useRef<Record<string, any>>({});

  const handleSelect = () => {
    if (tree[depth].type === 'clusterId') {
      onSelect(selectionDepth, tree[depth].type, aggData.key, aggData.key_as_string);
    } else {
      onSelect(selectionDepth, tree[depth].type, aggData.key);
    }
  };

  const onKeyboardToggle = () => {
    if (!isLastNode) {
      onToggleExpand();
    }
    handleSelect();
  };

  const onButtonToggle = () => {
    if (!isLastNode && !isExpanded) {
      onToggleExpand();
    }
    handleSelect();
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
      Object.entries({
        ...selectionDepth,
        [tree[depth].type]: aggData.key,
        ...(tree[depth].type === 'clusterId' &&
          aggData.key_as_string && {
            clusterName: aggData.key_as_string,
          }),
      })
        .map(([k, v]) => `${k}.${v}`)
        .join()
    );
  }, [aggData.key, aggData.key_as_string, depth, selected, selectionDepth, tree]);

  const clusterLevel = BREADCRUMBS_CLUSTER_TREE_VIEW_LEVELS[tree[depth].type];

  return (
    <li
      className={`euiTreeView__node
        ${isExpanded ? 'euiTreeView__node--expanded' : ''}
        ${isSelected ? 'euiTreeView__node--selected' : ''}
      `}
    >
      <button
        data-test-subj={expanded ? BUTTON_TEST_ID : ''}
        className="euiTreeView__nodeInner euiTreeView__nodeInner--withArrows"
        onClick={onButtonToggle}
        onKeyDown={onKeyDown}
        ref={(el) => (buttonRef.current[aggData.key] = el)}
        css={isLastNode ? styles.leafNodeButton : undefined}
      >
        {!isLastNode && (
          <EuiIcon
            className="euiTreeView__expansionArrow"
            type={isExpanded ? 'arrowDown' : 'arrowRight'}
            onClick={onArrowToggle}
          />
        )}
        <TreeViewIcon {...tree[depth].iconProps} css={styles.labelIcon} />
        <EuiToolTip content={`${clusterLevel}: ${aggData.key}`}>
          <span className="euiTreeView__nodeLabel">{aggData.key_as_string || aggData.key}</span>
        </EuiToolTip>
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
              ...(tree[depth].type === 'clusterId' && {
                clusterName: aggData.key_as_string,
              }),
            }}
            tree={tree}
            onSelect={onSelect}
            selected={selected}
            aria-label={`${aggData.key} child of ${props['aria-label']}`}
          />
        )}
      </div>
    </li>
  );
};
