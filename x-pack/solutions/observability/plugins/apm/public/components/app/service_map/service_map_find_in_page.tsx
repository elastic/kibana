/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiScreenReaderOnly,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useReactFlow } from '@xyflow/react';
import { css } from '@emotion/react';
import type { ServiceMapNode } from '../../../../common/service_map';
import { isServiceNodeData } from '../../../../common/service_map';
import { NODE_WIDTH, NODE_HEIGHT, CENTER_ANIMATION_DURATION_MS } from './constants';
import { useServiceMapSearchContext } from '../../shared/service_map/service_map_search_context';

export const SERVICE_MAP_FIND_INPUT_ID = 'serviceMapFindInPageInput';

const CENTER_ZOOM = 1.2;

function getSearchableNodes(nodes: ServiceMapNode[]): ServiceMapNode[] {
  return nodes.filter(
    (n) =>
      !n.hidden && ((n.type === 'service' && isServiceNodeData(n.data)) || n.type === 'dependency')
  );
}

function getAbsolutePosition(
  node: ServiceMapNode,
  allNodes: ServiceMapNode[]
): { x: number; y: number } {
  let x = node.position.x;
  let y = node.position.y;
  let current: ServiceMapNode | undefined = node;
  while (current?.parentId) {
    const parent = allNodes.find((n) => n.id === current!.parentId);
    if (!parent) break;
    x += parent.position.x;
    y += parent.position.y;
    current = parent;
  }
  return { x, y };
}

export interface ServiceMapFindInPageProps {
  nodes: ServiceMapNode[];
}

/**
 * Find-in-page for the service map: filters visible service/dependency nodes, centers the canvas on
 * matches, and keeps `selectedIndex` aligned with the last centered match (so prev/next stay in sync).
 */
export function ServiceMapFindInPage({ nodes }: ServiceMapFindInPageProps) {
  const { euiTheme } = useEuiTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const { setSearchHighlight } = useServiceMapSearchContext();

  /** False until the user has used next/enter/down at least once for this query (first action centers match 0). */
  const roundStartedRef = useRef(false);
  const searchResultsRef = useRef<ServiceMapNode[]>([]);
  const { setCenter } = useReactFlow();

  const searchableNodes = useMemo(() => getSearchableNodes(nodes), [nodes]);
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return searchableNodes.filter(
      (node) =>
        (node.data.label && String(node.data.label).toLowerCase().includes(q)) ||
        node.id.toLowerCase().includes(q)
    );
  }, [searchableNodes, searchQuery]);

  searchResultsRef.current = searchResults;

  useEffect(() => {
    setSelectedIndex(0);
    roundStartedRef.current = false;
  }, [searchQuery]);

  useEffect(() => {
    setSelectedIndex((idx) =>
      searchResults.length === 0 ? 0 : Math.min(idx, searchResults.length - 1)
    );
  }, [searchResults.length]);

  const matchNodeIds = useMemo(() => new Set(searchResults.map((n) => n.id)), [searchResults]);

  useEffect(() => {
    if (isFocused && searchResults.length > 0) {
      setSearchHighlight({
        matchNodeIds,
        activeMatchNodeId: searchResults[selectedIndex]?.id ?? null,
      });
    } else {
      setSearchHighlight({ matchNodeIds: new Set(), activeMatchNodeId: null });
    }
  }, [matchNodeIds, searchResults, selectedIndex, isFocused, setSearchHighlight]);

  const centerMapOnNode = useCallback(
    (node: ServiceMapNode) => {
      const { x, y } = getAbsolutePosition(node, nodes);
      const centerX = x + NODE_WIDTH / 2;
      const centerY = y + NODE_HEIGHT / 2;
      setCenter(centerX, centerY, {
        zoom: CENTER_ZOOM,
        duration: CENTER_ANIMATION_DURATION_MS,
      });
    },
    [nodes, setCenter]
  );

  const goToNextMatch = useCallback(() => {
    setSelectedIndex((idx) => {
      const currentMatches = searchResultsRef.current;
      const len = currentMatches.length;
      if (len === 0) {
        return idx;
      }

      if (!roundStartedRef.current) {
        roundStartedRef.current = true;
        const first = currentMatches[0];
        if (first) {
          centerMapOnNode(first);
        }
        return 0;
      }

      const nextIdx = (idx + 1) % len;
      const nextNode = currentMatches[nextIdx];
      if (nextNode) {
        centerMapOnNode(nextNode);
      }
      return nextIdx;
    });
  }, [centerMapOnNode]);

  const goToPreviousMatch = useCallback(() => {
    setSelectedIndex((idx) => {
      const currentMatches = searchResultsRef.current;
      const len = currentMatches.length;
      if (len === 0) {
        return idx;
      }

      roundStartedRef.current = true;
      const prevIdx = (idx - 1 + len) % len;
      const node = currentMatches[prevIdx];
      if (node) {
        centerMapOnNode(node);
      }
      return prevIdx;
    });
  }, [centerMapOnNode]);

  const onSearchKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const results = searchResultsRef.current;
      if (results.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNextMatch();
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPreviousMatch();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        goToNextMatch();
        return;
      }
    },
    [goToNextMatch, goToPreviousMatch]
  );

  const matchesCounterLabel =
    searchResults.length > 0 ? `${selectedIndex + 1}/${searchResults.length}` : '0/0';

  const findInPageAppendCss = useMemo(
    () => css`
      .serviceMapFindInPage__matchesCounter {
        font-variant-numeric: tabular-nums;
        padding-inline: ${euiTheme.size.xs};
      }

      .euiFormControlLayout__append {
        padding-inline-end: 0;
      }
    `,
    [euiTheme]
  );

  return (
    <>
      <div css={findInPageAppendCss}>
        <EuiFieldSearch
          id={SERVICE_MAP_FIND_INPUT_ID}
          placeholder={i18n.translate('xpack.apm.serviceMap.controls.findInPagePlaceholder', {
            defaultMessage: 'Find in page (⌘K)',
          })}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={onSearchKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          fullWidth
          compressed
          isClearable
          incremental
          data-test-subj="serviceMapControlsSearch"
          aria-label={i18n.translate('xpack.apm.serviceMap.controls.searchAriaLabel', {
            defaultMessage:
              'Search services and dependencies on the map. Up arrow or the previous button centers the map on the previous match. Down arrow, Enter, or the next button centers the map on the next match.',
          })}
          append={
            <EuiFlexGroup responsive={false} alignItems="center" gutterSize="none">
              <EuiFlexItem
                grow={false}
                className="serviceMapFindInPage__matchesCounter"
                data-test-subj="serviceMapFindMatchSummary"
                aria-live="polite"
              >
                <EuiText color="subdued" size="s">
                  {matchesCounterLabel}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="chevronSingleUp"
                  display="empty"
                  color="text"
                  size="s"
                  aria-label={i18n.translate('xpack.apm.serviceMap.find.previousMatch', {
                    defaultMessage: 'Go to previous match on the map',
                  })}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    goToPreviousMatch();
                  }}
                  isDisabled={searchResults.length === 0}
                  data-test-subj="serviceMapFindPrevious"
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="chevronSingleDown"
                  display="empty"
                  color="text"
                  size="s"
                  aria-label={i18n.translate('xpack.apm.serviceMap.find.nextMatch', {
                    defaultMessage: 'Go to next match on the map',
                  })}
                  onMouseDown={(e: React.MouseEvent) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    goToNextMatch();
                  }}
                  isDisabled={searchResults.length === 0}
                  data-test-subj="serviceMapFindNext"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          }
        />
      </div>
      <EuiScreenReaderOnly>
        <div>
          <p>
            {searchQuery.trim() && searchResults.length === 0
              ? i18n.translate('xpack.apm.serviceMap.controls.noResultsFound', {
                  defaultMessage: 'No services or dependencies found',
                })
              : null}
          </p>
          <p>
            {searchResults.length > 0 && searchResults[selectedIndex]
              ? i18n.translate('xpack.apm.serviceMap.find.activeMatchName', {
                  defaultMessage: 'Active match: {name}',
                  values: {
                    name: String(
                      searchResults[selectedIndex].data.label ?? searchResults[selectedIndex].id
                    ),
                  },
                })
              : null}
          </p>
        </div>
      </EuiScreenReaderOnly>
    </>
  );
}

/** Focus the find input (e.g. after Cmd+K). */
export function focusServiceMapFindInput() {
  document.getElementById(SERVICE_MAP_FIND_INPUT_ID)?.focus();
}
