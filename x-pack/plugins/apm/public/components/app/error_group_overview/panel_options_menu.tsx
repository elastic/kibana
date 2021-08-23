/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButtonIcon,
  EuiContextMenu,
  EuiContextMenuPanelDescriptor,
  EuiPopover,
} from '@elastic/eui';
import React, { useState } from 'react';
import { RequestStatus } from '../../../../../../../src/plugins/inspector/common';
import {
  InspectorSession,
  RequestAdapter,
} from '../../../../../../../src/plugins/inspector/public';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';

export function PanelOptionsMenu({ data }: { data: any }) {
  const inspectorAdapters = { requests: new RequestAdapter() };
  const { inspector } = useApmPluginContext();
  const [inspectorSession, setInspectorSession] = useState<
    InspectorSession | undefined
  >(undefined);
  const [isOpen, setIsOpen] = useState(false);
  const toggleContextMenu = () => {
    setIsOpen((prevIsOpen) => !prevIsOpen);
  };

  const inspect = () => {
    toggleContextMenu();
    const session = inspector.open(inspectorAdapters, {
      title: 'Error occurrences (TODO)',
    });
    data._inspect.forEach((operation) => {
      const requestParams = {
        id: operation.operationName,
        name: operation.operationName,
        // Taken from https://github.com/smith/kibana/blob/b1202c2a42a878069350797e70b2950d69d78027/src/plugins/data/common/search/search_source/inspect/inspector_stats.ts#L29
        // TODO: Fill in all (or most of) the stats
        stats: {
          indexPattern: {
            label: 'Index pattern',
            value: operation.requestParams.index,
            description:
              'The index pattern that connected to the Elasticsearch indices.',
          },
        },
      };
      const requestResponder = inspectorAdapters.requests.start(
        operation.operationName,
        requestParams
      );
      requestResponder.json(operation.requestParams.body);
      // TODO: Get status as well as data
      requestResponder.finish(RequestStatus.OK, { json: operation.response });
    });

    setInspectorSession(session);
  };

  const button = (
    <EuiButtonIcon
      iconType="boxesHorizontal"
      color="text"
      className="embPanel__optionsMenuButton"
      aria-label={'todo'}
      onClick={toggleContextMenu}
      style={{ position: 'relative' }}
    />
  );
  const panels: EuiContextMenuPanelDescriptor[] = [
    {
      id: 'mainMenu',
      title: 'Options',
      items: [
        {
          name: 'Inspect',
          icon: 'inspect',
          onClick: inspect,
        },
      ],
    },
  ];
  return (
    <EuiPopover button={button} isOpen={isOpen}>
      <EuiContextMenu initialPanelId="mainMenu" panels={panels} />
    </EuiPopover>
  );
}
