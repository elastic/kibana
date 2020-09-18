/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState } from 'react';
import { EuiButton, EuiContextMenu, EuiPopover, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { AutoFollowPatternDeleteProvider } from '../auto_follow_pattern_delete_provider';

// @ts-ignore
import { routing } from '../../services/routing';

const actionsAriaLabel = i18n.translate(
  'xpack.crossClusterReplication.autoFollowActionMenu.autoFollowPatternActionMenuButtonAriaLabel',
  {
    defaultMessage: 'Auto-follow pattern options',
  }
);

export interface Props {
  edit: boolean;
  patterns: Array<{ name: string; active: boolean }>;
  deleteAutoFollowPattern: (id: string[]) => void;
  pauseAutoFollowPattern: (id: string[]) => void;
  resumeAutoFollowPattern: (id: string[]) => void;
  arrowDirection: 'up' | 'down';
}

const allValuesSame = (values: boolean[]) => {
  if (!values.length) {
    return false;
  }
  const [firstValue, ...restValues] = values;

  for (const value of restValues) {
    if (firstValue !== value) {
      return false;
    }
  }

  return true;
};

const AutoFollowPatternActionMenuUI: FunctionComponent<Props> = ({
  patterns,
  deleteAutoFollowPattern,
  pauseAutoFollowPattern,
  resumeAutoFollowPattern,
  arrowDirection,
  edit,
}) => {
  const [showPopover, setShowPopover] = useState(false);

  const allActiveValuesSame = allValuesSame(patterns.filter(Boolean).map(({ active }) => active));

  const closePopoverViaAction = () => {
    setShowPopover(false);
  };

  const panelItems = [
    /**
     * Resume or pause pattern
     */
    allActiveValuesSame
      ? patterns[0].active
        ? {
            name: i18n.translate('xpack.crossClusterReplication.pauseAutoFollowPatternsLabel', {
              defaultMessage: 'Pause {total, plural, one {replication} other {replications}}',
              values: { total: patterns.length },
            }),
            icon: <EuiIcon type="pause" />,
            onClick: () => {
              pauseAutoFollowPattern(patterns.map(({ name }) => name));
              closePopoverViaAction();
            },
          }
        : {
            name: i18n.translate('xpack.crossClusterReplication.resumeAutoFollowPatternsLabel', {
              defaultMessage: 'Resume {total, plural, one {replication} other {replications}}',
              values: { total: patterns.length },
            }),
            icon: <EuiIcon type="play" />,
            onClick: () => {
              resumeAutoFollowPattern(patterns.map(({ name }) => name));
              closePopoverViaAction();
            },
          }
      : null,
    /**
     * Navigate to edit a pattern
     */
    edit && patterns.length === 1
      ? {
          name: i18n.translate('xpack.crossClusterReplication.editAutoFollowPatternButtonLabel', {
            defaultMessage: 'Edit pattern',
          }),
          icon: <EuiIcon type="pencil" />,
          onClick: () => {
            routing.navigate(routing.getAutoFollowPatternPath(patterns[0].name));
          },
        }
      : null,
    /**
     * Delete a pattern
     */
    {
      name: i18n.translate('xpack.crossClusterReplication.deleteAutoFollowPatternButtonLabel', {
        defaultMessage: 'Delete {total, plural, one {pattern} other {patterns}}',
        values: {
          total: patterns.length,
        },
      }),
      icon: <EuiIcon type="trash" />,
      onClick: () => {
        deleteAutoFollowPattern(patterns.map(({ name }) => name));
        closePopoverViaAction();
      },
    },
  ].filter(Boolean);

  const button = (
    <EuiButton
      data-test-subj="autoFollowPatternActionMenuButton"
      aria-label={actionsAriaLabel}
      onClick={() => setShowPopover(!showPopover)}
      iconType={arrowDirection === 'up' ? 'arrowUp' : 'arrowDown'}
      iconSide="right"
      fill
    >
      {i18n.translate('xpack.crossClusterReplication.autoFollowPatternActionMenu.buttonLabel', {
        defaultMessage: 'Manage {patterns, plural, one {pattern} other {patterns}}',
        values: { patterns: patterns.length },
      })}
    </EuiButton>
  );

  return (
    <EuiPopover
      isOpen={showPopover}
      closePopover={() => setShowPopover(false)}
      button={button}
      panelPaddingSize="none"
      withTitle
      repositionOnScroll
    >
      <EuiContextMenu
        initialPanelId={0}
        data-test-subj="autoFollowPatternActionContextMenu"
        panels={[
          {
            id: 0,
            title: i18n.translate(
              'xpack.crossClusterReplication.autoFollowPatternActionMenu.panelTitle',
              {
                defaultMessage: 'Pattern options',
              }
            ),
            items: panelItems as any,
          },
        ]}
      />
    </EuiPopover>
  );
};

export const AutoFollowPatternActionMenu = (props: Omit<Props, 'deleteAutoFollowPatterns'>) => (
  <AutoFollowPatternDeleteProvider>
    {(deleteAutoFollowPattern: (ids: string[]) => void) => (
      <AutoFollowPatternActionMenuUI {...props} deleteAutoFollowPattern={deleteAutoFollowPattern} />
    )}
  </AutoFollowPatternDeleteProvider>
);
