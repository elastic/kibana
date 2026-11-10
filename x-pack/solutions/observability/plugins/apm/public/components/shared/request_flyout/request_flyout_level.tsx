/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EBT_CLICK_ACTIONS, getEbtProps } from '@kbn/ebt-click';
import { FlyoutTemplate } from '@kbn/flyout-template';
import React from 'react';
import { REQUEST_FLYOUT_EBT_ELEMENTS } from './ebt_constants';
import { ACTIONS_BUTTON_LABEL, useRequestFlyoutFooterMenu } from './footer';
import { renderRequestFlyoutChild } from './render_request_flyout_child';
import { RequestFlyoutChildProvider } from './request_flyout_child';
import { RequestFlyoutBody } from './request_flyout_content';
import { useRequestFlyoutContext } from './request_flyout_context';
import type { RequestFlyoutChildSession } from './types';

interface RequestFlyoutLevelProps {
  title: string;
  onClose: () => void;
  /** How this flyout is attached to the EUI flyout session. */
  session: 'start' | 'inherit';
  size: 'm' | 'fill';
  /** How the child flyouts of this level are attached to the EUI flyout session. */
  childSession: RequestFlyoutChildSession;
  historyKey: symbol;
  'data-test-subj': string;
}

/**
 * A level of the request flyout system: the flyout of an edge, or of one resource of a grouped
 * edge. Each level owns one child flyout slot. The template only recognizes zones that are its
 * direct JSX children, so the tree is authored here.
 */
export function RequestFlyoutLevel({
  title,
  onClose,
  session,
  size,
  childSession,
  historyKey,
  'data-test-subj': dataTestSubj,
}: RequestFlyoutLevelProps) {
  const context = useRequestFlyoutContext();
  const panels = useRequestFlyoutFooterMenu();

  return (
    <RequestFlyoutChildProvider
      render={(child, close) =>
        renderRequestFlyoutChild({ child, close, context, childSession, historyKey })
      }
    >
      <FlyoutTemplate
        data-test-subj={dataTestSubj}
        onClose={onClose}
        ownFocus={false}
        size={size}
        // Pixel-locked width: it re-clamps under a nested session="start".
        minWidth={size === 'm' ? 660 : undefined}
        session={session}
        historyKey={historyKey}
      >
        <FlyoutTemplate.Header title={title} />
        <FlyoutTemplate.Body>
          <RequestFlyoutBody />
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryActionMenu
            label={ACTIONS_BUTTON_LABEL}
            panels={panels}
            data-test-subj="requestFlyoutActionsButton"
            {...getEbtProps({
              action: EBT_CLICK_ACTIONS.OPEN_ACTIONS,
              element: REQUEST_FLYOUT_EBT_ELEMENTS.ACTIONS_MENU,
            })}
          />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    </RequestFlyoutChildProvider>
  );
}
