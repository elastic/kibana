/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import {
  EuiIcon,
  EuiText,
  EuiIconProps,
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
import { QueryDslQueryContainerBool } from '../../../types';
import { useFetchDynamicTreeView } from './hooks';
import { useStyles } from './styles';

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

type DynamicTree = {
  key: string;
  iconProps: EuiIconProps;
  name: string;
};

type Props = {
  tree: DynamicTree[];
  depth?: number;
  query: QueryDslQueryContainerBool;
  indexPattern: string;
  onSelect?: (key: string | number) => void;
  'aria-label': string;
};

export const DynamicTreeView = ({
  tree,
  depth = 0,
  query,
  indexPattern,
  onSelect,
  ...props
}: Props) => {
  const styles = useStyles(depth);

  const { data, fetchNextPage, isFetchingNextPage, hasNextPage, isLoading } =
    useFetchDynamicTreeView(query, tree[depth].key, indexPattern);

  const ariaLabel = props['aria-label'];

  const buttonRef = useRef<Record<string, any>>({});

  const onChildrenKeydown = (event: React.KeyboardEvent, key: string) => {
    if (event.key === keys.ARROW_LEFT) {
      event.preventDefault();
      event.stopPropagation();
      buttonRef.current[key].focus();
    }
  };

  const onLoadMoreKeydown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case keys.ARROW_DOWN: {
        const nodeButtons = Array.from(
          document.querySelectorAll(`[data-test-subj="dynamicTreeViewButton"]`)
        );
        const currentIndex = nodeButtons.indexOf(event.currentTarget);
        if (currentIndex > -1) {
          const nextButton = nodeButtons[currentIndex + 1] as HTMLElement;
          if (nextButton) {
            event.preventDefault();
            event.stopPropagation();
            nextButton.focus();
          }
        }
        break;
      }
      case keys.ARROW_UP: {
        const nodeButtons = Array.from(
          document.querySelectorAll(`[data-test-subj="dynamicTreeViewButton"]`)
        );
        const currentIndex = nodeButtons.indexOf(event.currentTarget);
        if (currentIndex > -1) {
          const prevButton = nodeButtons[currentIndex + -1] as HTMLElement;
          if (prevButton) {
            event.preventDefault();
            event.stopPropagation();
            prevButton.focus();
          }
        }
        break;
      }
      case keys.ARROW_RIGHT: {
        event.preventDefault();
        event.stopPropagation();
        fetchNextPage();
      }
    }
  };

  useEffect(() => {
    fetchNextPage();
  }, [fetchNextPage]);

  const onClickNextPageHandler = (e: MouseEvent<HTMLButtonElement>) => {
    fetchNextPage();
  };

  return (
    <EuiText size="s" className="euiTreeView__wrapper">
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
              <DynamicTreeViewExpander>
                {({ isExpanded, onToggleExpand }) => {
                  const isLastNode = depth === tree.length - 1;

                  const onToggle = () => {
                    if (!isLastNode) {
                      onToggleExpand();
                    }
                    onSelect?.(aggData.key);
                  };

                  // Enable keyboard navigation
                  const onKeyDown = (event: React.KeyboardEvent) => {
                    switch (event.key) {
                      case keys.ARROW_DOWN: {
                        const nodeButtons = Array.from(
                          document.querySelectorAll(`[data-test-subj="dynamicTreeViewButton"]`)
                        );
                        const currentIndex = nodeButtons.indexOf(event.currentTarget);
                        if (currentIndex > -1) {
                          const nextButton = nodeButtons[currentIndex + 1] as HTMLElement;
                          if (nextButton) {
                            event.preventDefault();
                            event.stopPropagation();
                            nextButton.focus();
                          }
                        }
                        break;
                      }
                      case keys.ARROW_UP: {
                        const nodeButtons = Array.from(
                          document.querySelectorAll(`[data-test-subj="dynamicTreeViewButton"]`)
                        );
                        const currentIndex = nodeButtons.indexOf(event.currentTarget);
                        if (currentIndex > -1) {
                          const prevButton = nodeButtons[currentIndex + -1] as HTMLElement;
                          if (prevButton) {
                            event.preventDefault();
                            event.stopPropagation();
                            prevButton.focus();
                          }
                        }
                        break;
                      }
                      case keys.ARROW_RIGHT: {
                        if (!isExpanded && !isLastNode) {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggle();
                        }
                        break;
                      }
                      case keys.ARROW_LEFT: {
                        if (isExpanded) {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggle();
                        }
                      }
                      default:
                        break;
                    }
                  };
                  return (
                    <li
                      className={`euiTreeView__node ${
                        isExpanded ? 'euiTreeView__node--expanded' : ''
                      }`}
                      key={aggData.key}
                    >
                      <button
                        data-test-subj="dynamicTreeViewButton"
                        className="euiTreeView__nodeInner euiTreeView__nodeInner--withArrows"
                        onClick={onToggle}
                        onKeyDown={(event: React.KeyboardEvent) => onKeyDown(event)}
                        ref={(el) => (buttonRef.current[aggData.key] = el)}
                      >
                        {!isLastNode && (
                          <EuiIcon
                            className="euiTreeView__expansionArrow"
                            type={isExpanded ? 'arrowDown' : 'arrowRight'}
                          />
                        )}
                        <EuiIcon {...tree[depth].iconProps} css={styles.labelIcon} />
                        <span className="euiTreeView__nodeLabel">{aggData.key}</span>
                      </button>
                      {isExpanded && (
                        <div
                          onKeyDown={(event: React.KeyboardEvent) =>
                            onChildrenKeydown(event, aggData.key)
                          }
                        >
                          <DynamicTreeView
                            key={aggData.key}
                            query={queryFilter}
                            depth={depth + 1}
                            tree={tree}
                            indexPattern={indexPattern}
                            onSelect={onSelect}
                            aria-label={`${aggData.key} child of ${ariaLabel}`}
                          />
                        </div>
                      )}
                    </li>
                  );
                }}
              </DynamicTreeViewExpander>
            );
          });
        })}
        {hasNextPage && (
          <li className="euiTreeView__node" css={styles.loadMoreButtonWrapper}>
            <EuiBadge
              css={styles.loadMoreButton}
              onClickAriaLabel={TREE_NAVIGATION_SHOW_MORE(tree[depth].name)}
              data-test-subj="dynamicTreeViewButton"
              onKeyDown={(event: React.KeyboardEvent) => onLoadMoreKeydown(event)}
              onClick={onClickNextPageHandler}
            >
              <span css={styles.loadMoreText}>
                {isFetchingNextPage
                  ? TREE_NAVIGATION_LOADING
                  : TREE_NAVIGATION_SHOW_MORE(tree[depth].name)}
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
