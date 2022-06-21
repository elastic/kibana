/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useRef, MouseEvent } from 'react';
import { EuiIcon, EuiText, EuiIconProps, EuiI18n, EuiScreenReaderOnly } from '@elastic/eui';
import { QueryDslQueryContainerBool } from '../../../types';
import { useFetchDynamicTreeView } from './hooks';

export const ENTER = 'Enter';
export const SPACE = ' ';
export const ESCAPE = 'Escape';
export const TAB = 'Tab';
export const BACKSPACE = 'Backspace';
export const F2 = 'F2';

export const ALT = 'Alt';
export const SHIFT = 'Shift';
export const CTRL = 'Control';
export const META = 'Meta'; // Windows, Command, Option

export const ARROW_DOWN = 'ArrowDown';
export const ARROW_UP = 'ArrowUp';
export const ARROW_LEFT = 'ArrowLeft';
export const ARROW_RIGHT = 'ArrowRight';

export const PAGE_UP = 'PageUp';
export const PAGE_DOWN = 'PageDown';
export const END = 'End';
export const HOME = 'Home';

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
  const { data, fetchNextPage, hasNextPage, isLoading } = useFetchDynamicTreeView(
    query,
    tree[depth].key,
    indexPattern
  );

  const ariaLabel = props['aria-label'];

  const buttonRef = useRef<Record<string, any>>({});

  const onChildrenKeydown = (event: React.KeyboardEvent, key: string) => {
    if (event.key === ARROW_LEFT) {
      event.preventDefault();
      event.stopPropagation();
      buttonRef.current[key].focus();
    }
  };

  const onLoadMoreKeydown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case ARROW_DOWN: {
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
      case ARROW_UP: {
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
      case ARROW_RIGHT: {
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
      {isLoading && <div>Loading</div>}
      {data?.pages?.length && (
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
                      case ARROW_DOWN: {
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
                      case ARROW_UP: {
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
                      case ARROW_RIGHT: {
                        if (!isExpanded && !isLastNode) {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleExpand();
                        }
                        break;
                      }
                      case ARROW_LEFT: {
                        if (isExpanded) {
                          event.preventDefault();
                          event.stopPropagation();
                          onToggleExpand();
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
                        <EuiIcon
                          {...tree[depth].iconProps}
                          style={{ marginLeft: 4, marginRight: 4 }}
                        />
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
          <li className="euiTreeView__node">
            <button
              data-test-subj="dynamicTreeViewButton"
              onKeyDown={(event: React.KeyboardEvent) => onLoadMoreKeydown(event)}
              onClick={onClickNextPageHandler}
            >
              load more
            </button>
          </li>
        )}
      </ul>
    </EuiText>
  );
};
