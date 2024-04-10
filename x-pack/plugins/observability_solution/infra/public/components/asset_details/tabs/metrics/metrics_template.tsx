/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useRef, useCallback, useEffect } from 'react';
import {
  EuiFlexItem,
  EuiFlexGroup,
  useEuiTheme,
  EuiListGroup,
  EuiListGroupItem,
  useEuiMaxBreakpoint,
  useEuiMinBreakpoint,
  useIsWithinBreakpoints,
  useResizeObserver,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { useKibanaHeader } from '../../../../hooks/use_kibana_header';
import { HOST_METRIC_GROUP_TITLES } from '../../translations';
import { useAssetDetailsRenderPropsContext } from '../../hooks/use_asset_details_render_props';
import { useTabSwitcherContext } from '../../hooks/use_tab_switcher';

export const MetricsTemplate = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(
  ({ children }, ref) => {
    const { actionMenuHeight } = useKibanaHeader();
    const { euiTheme } = useEuiTheme();
    const { renderMode } = useAssetDetailsRenderPropsContext();
    const { scrollTo, setScrollTo } = useTabSwitcherContext();

    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const initialScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const quickAccessItemsRef = useRef<Set<string>>(new Set());
    const contentRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});
    const quickAccessRef = useRef<HTMLDivElement | null>(null);

    const isLargeScreen = useIsWithinBreakpoints(['xl'], true);
    const listGroupDimensions = useResizeObserver(quickAccessRef.current);

    const offsetTop =
      renderMode.mode === 'flyout'
        ? `${actionMenuHeight}px`
        : `calc(${actionMenuHeight}px + var(--euiFixedHeadersOffset, 0))`;

    const offsetScrollMarginTop = `calc(${offsetTop} + ${euiTheme.size.xs} + ${
      isLargeScreen ? '0' : listGroupDimensions.height
    }px)`;

    const setContentRef = useCallback((contentRef: HTMLDivElement | null) => {
      const metric = contentRef?.getAttribute('data-section-id');
      if (!metric) {
        return;
      }

      contentRefs.current[metric] = contentRef;

      if (!quickAccessItemsRef.current.has(metric)) {
        quickAccessItemsRef.current.add(metric);
      }
    }, []);

    const scrollToSection = useCallback((sectionId: string, retries = 5, delay = 300) => {
      const chartEl = contentRefs.current[sectionId]?.querySelectorAll('.euiPanel') ?? [];
      if (chartEl.length > 0) {
        contentRefs.current[sectionId]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      } else if (retries > 0) {
        // Retry scrolling after a delay - needed for conditionally rendered content
        const nextDelay = delay * 2;
        scrollTimeoutRef.current = setTimeout(
          () => scrollToSection(sectionId, retries - 1),
          nextDelay
        );
      }
    }, []);

    const onQuickAccessItemClick = (metric: string) => {
      if (metric !== scrollTo) {
        setScrollTo(metric);
      } else {
        scrollToSection(metric);
      }
    };

    useEffect(() => {
      if (scrollTo) {
        // Wait for the calculation of offsetScrollMarginTop
        initialScrollTimeoutRef.current = setTimeout(() => scrollToSection(scrollTo), 100);
      }
    }, [scrollTo, scrollToSection]);

    useEffect(
      () => () => {
        [scrollTimeoutRef.current, initialScrollTimeoutRef.current]
          .filter((timeout): timeout is NodeJS.Timeout => !!timeout)
          .forEach((timeout) => clearTimeout(timeout));
      },
      []
    );

    const quickAccessItems = [...quickAccessItemsRef.current];

    return (
      <EuiFlexGroup
        gutterSize="s"
        direction="row"
        css={css`
          ${useEuiMaxBreakpoint('xl')} {
            flex-direction: column;
          }
        `}
        data-test-subj="infraAssetDetailsMetricChartsContent"
        ref={ref}
      >
        <EuiFlexItem
          grow={false}
          css={css`
            position: sticky;
            top: ${offsetTop};
            background: ${euiTheme.colors.emptyShade};
            min-width: 100px;
            z-index: ${euiTheme.levels.navigation};
            ${useEuiMinBreakpoint('xl')} {
              align-self: flex-start;
            }
          `}
        >
          <div ref={quickAccessRef}>
            <EuiListGroup
              flush
              bordered={false}
              maxWidth={false}
              css={css`
                width: 100%;
                ${useEuiMaxBreakpoint('xl')} {
                  margin-top: ${euiTheme.size.xs};
                  flex-direction: row;
                  flex-wrap: wrap;
                }
              `}
            >
              {quickAccessItems.map((item) => (
                <EuiListGroupItem
                  data-test-subj={`infraMetricsQuickAccessItem${item}`}
                  onClick={() => onQuickAccessItemClick(item)}
                  label={HOST_METRIC_GROUP_TITLES[item]}
                  size="s"
                />
              ))}
            </EuiListGroup>
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup
            gutterSize="m"
            direction="column"
            css={css`
              &:first-child {
                margin-top: ${euiTheme.size.s};
              }
              & > [data-section-id] {
                scroll-margin-top: ${offsetScrollMarginTop};
              }
            `}
          >
            {React.Children.map(children, (child, index) => {
              if (React.isValidElement(child)) {
                return React.cloneElement(child as React.ReactElement, {
                  ref: setContentRef,
                  key: index,
                });
              }
            })}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);
