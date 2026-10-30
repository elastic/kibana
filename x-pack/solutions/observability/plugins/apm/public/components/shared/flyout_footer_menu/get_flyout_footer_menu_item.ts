/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlyoutFooterMenuItem } from '@kbn/flyout-template';
import { getEbtProps } from '@kbn/ebt-click';
import type { EbtClickAttrs } from '@kbn/ebt-click';
import type { MouseEvent } from 'react';
import { isLeftClick, isModifiedClick } from '../../../utils/mouse_event';

export interface FlyoutFooterMenuAction {
  id: string;
  name: string;
  href?: string;
  onClick?: () => void;
  ebt?: EbtClickAttrs;
}

/**
 * Resolves a menu item's navigation props. A combined href + onClick runs the handler on a plain
 * left-click and otherwise follows the href (e.g. cmd-click opens a new tab).
 */
function getItemNavigation(href?: string, onClick?: () => void) {
  if (href && onClick) {
    return {
      href,
      onClick: (e: MouseEvent) => {
        if (!isLeftClick(e) || isModifiedClick(e)) return;
        e.preventDefault();
        onClick();
      },
    };
  }
  if (href) {
    return { href, target: '_self' as const };
  }
  return { onClick };
}

/**
 * Builds a `Footer.PrimaryActionMenu` item with the `${dataTestSubjPrefix}Item-${id}` test subject
 * used by the APM flyout action menus.
 */
export function getFlyoutFooterMenuItem(
  { id, name, href, onClick, ebt }: FlyoutFooterMenuAction,
  dataTestSubjPrefix: string
): FlyoutFooterMenuItem {
  return {
    name,
    ...getItemNavigation(href, onClick),
    ...(ebt ? getEbtProps(ebt) : {}),
    'data-test-subj': `${dataTestSubjPrefix}Item-${id}`,
  };
}
