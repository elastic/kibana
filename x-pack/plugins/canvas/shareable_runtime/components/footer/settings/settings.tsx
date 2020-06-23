/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState, FC } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiButtonIcon, EuiPopover, EuiContextMenu } from '@elastic/eui';
import { useCanvasShareableState } from '../../../context';
import { Refs } from '../../../types';
import { ToolbarSettings } from './toolbar_settings';
import { AutoplaySettings } from './autoplay_settings';

interface Props {
  /**
   * A collection of React `ref` objects for the Shareable Runtime.
   */
  refs: Refs;
}

/**
 * The Settings Popover for Canvas Shareable Workpads.
 */
export const SettingsComponent: FC<Props> = ({ refs }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);
  const button = (
    <EuiButtonIcon
      color="ghost"
      iconType="gear"
      aria-label="Settings"
      onClick={() => setPopoverOpen(!isPopoverOpen)}
    />
  );

  const flattenPanelTree = (tree: any, array: any[] = []) => {
    array.push(tree);

    if (tree.items) {
      tree.items.forEach((item: any) => {
        if (item.panel) {
          flattenPanelTree(item.panel, array);
          item.panel = item.panel.id;
        }
      });
    }

    return array;
  };

  const panels = flattenPanelTree({
    id: 0,
    title: 'Settings',
    items: [
      {
        name: 'Auto Play',
        icon: 'play',
        panel: {
          id: 1,
          title: 'Auto Play',
          content: <AutoplaySettings />,
        },
      },
      {
        name: 'Toolbar',
        icon: 'boxesHorizontal',
        panel: {
          id: 2,
          title: 'Toolbar',
          content: <ToolbarSettings onSetAutohide={() => setPopoverOpen(false)} />,
        },
      },
    ],
  });

  return (
    <EuiFlexGroup alignItems="flexEnd" justifyContent="center" direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>
        <EuiPopover
          closePopover={() => setPopoverOpen(false)}
          id="settings"
          isOpen={isPopoverOpen}
          button={button}
          panelPaddingSize="none"
          withTitle
          anchorPosition="upRight"
          insert={
            refs.stage.current ? { sibling: refs.stage.current, position: 'after' } : undefined
          }
        >
          <EuiContextMenu initialPanelId={0} panels={panels} />
        </EuiPopover>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

/**
 * A store-connected container for the `Settings` component.
 */
export const Settings: FC<{}> = () => {
  const [{ refs }] = useCanvasShareableState();

  return <SettingsComponent refs={refs} />;
};
