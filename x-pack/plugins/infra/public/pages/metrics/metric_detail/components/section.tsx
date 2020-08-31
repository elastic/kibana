/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTitle } from '@elastic/eui';
import React, {
  Children,
  cloneElement,
  FunctionComponent,
  isValidElement,
  useContext,
} from 'react';

import { SideNavContext, SubNavItem } from '../lib/side_nav_context';
import { LayoutProps } from '../types';

type SectionProps = LayoutProps & {
  navLabel: string;
  sectionLabel: string;
};

export const Section: FunctionComponent<SectionProps> = ({
  children,
  metrics,
  navLabel,
  sectionLabel,
  onChangeRangeTime,
  isLiveStreaming,
  stopLiveStreaming,
}) => {
  const { addNavItem } = useContext(SideNavContext);

  const subNavItems = Children.toArray(children).reduce<SubNavItem[]>(
    (accumulatedChildren, child) => {
      if (!isValidElement(child)) {
        return accumulatedChildren;
      }
      const metric = metrics?.find((m) => m.id === child.props.id) ?? null;
      if (metric === null) {
        return accumulatedChildren;
      }
      if (!child.props.label) {
        return accumulatedChildren;
      }
      return [
        ...accumulatedChildren,
        {
          id: child.props.id,
          name: child.props.label,
          onClick: () => {
            const el = document.getElementById(child.props.id);
            if (el) {
              el.scrollIntoView();
            }
          },
        },
      ];
    },
    []
  );

  const childrenWithProps = Children.map(children, (child) =>
    isValidElement(child)
      ? cloneElement(child, {
          metrics,
          onChangeRangeTime,
          isLiveStreaming,
          stopLiveStreaming,
        })
      : null
  );

  if (metrics && subNavItems.length) {
    addNavItem({ id: navLabel, name: navLabel, items: subNavItems });
    return (
      <div>
        <EuiTitle>
          <h1>{sectionLabel}</h1>
        </EuiTitle>
        {childrenWithProps}
      </div>
    );
  }

  return null;
};
