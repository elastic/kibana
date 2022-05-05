/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment, useCallback } from 'react';
import {
  EuiDescriptionList,
  EuiDescriptionListDescription,
  EuiDescriptionListTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFocusTrap,
  EuiOutsideClickDetector,
  EuiPanel,
  EuiPortal,
  EuiTitle,
  EuiWindowEvent,
  keys,
  useIsWithinBreakpoints,
} from '@elastic/eui';
import classNames from 'classnames';
import { groupedNavPanelStyles } from './solution_grouped_nav_panel.styles';
import { PortalNavItem } from './solution_grouped_nav_item';
import { useShowTimeline } from '../../../utils/timeline/use_show_timeline';

interface SolutionGroupedNavPanelProps {
  onClose: () => void;
  title: string;
  items: PortalNavItem[];
}

const SolutionGroupedNavPanelComponent: React.FC<SolutionGroupedNavPanelProps> = ({
  onClose,
  title,
  items,
}) => {
  const [hasTimelineBar] = useShowTimeline();
  const isLargerBreakpoint = useIsWithinBreakpoints(['l', 'xl']);
  const isTimelineVisible = hasTimelineBar && isLargerBreakpoint;

  const styles = groupedNavPanelStyles(isTimelineVisible);
  const panelClasses = classNames('eui-yScroll');

  /**
   * ESC key closes SideNav
   */
  const onKeyDown = useCallback(
    (ev: KeyboardEvent) => {
      if (ev.key === keys.ESCAPE) {
        onClose();
      }
    },
    [onClose]
  );

  return (
    <>
      <EuiWindowEvent event="keydown" handler={onKeyDown} />
      <EuiPortal>
        <EuiFocusTrap autoFocus>
          <EuiOutsideClickDetector onOutsideClick={() => onClose()}>
            <EuiPanel
              className={panelClasses}
              hasShadow={!isTimelineVisible}
              css={styles.panel}
              borderRadius="none"
              paddingSize="l"
            >
              <EuiFlexGroup direction="column" gutterSize="l" alignItems="flexStart">
                <EuiFlexItem>
                  <EuiTitle size="xs">
                    <strong>{title}</strong>
                  </EuiTitle>
                </EuiFlexItem>

                <EuiFlexItem>
                  <EuiDescriptionList>
                    {items.map(({ id, href, onClick, label, description }: PortalNavItem) => (
                      <Fragment key={id}>
                        <EuiDescriptionListTitle>
                          <a
                            href={href}
                            onClick={(ev) => {
                              onClose();
                              if (onClick) {
                                onClick(ev);
                              }
                            }}
                          >
                            {label}
                          </a>
                        </EuiDescriptionListTitle>
                        <EuiDescriptionListDescription>{description}</EuiDescriptionListDescription>
                      </Fragment>
                    ))}
                  </EuiDescriptionList>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiPanel>
          </EuiOutsideClickDetector>
        </EuiFocusTrap>
      </EuiPortal>
    </>
  );
};

export const SolutionGroupedNavPanel = React.memo(SolutionGroupedNavPanelComponent);
