/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { useSelector } from 'react-redux';
import { EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { getSelectedToplevelNodes, getSelectedElementId } from '../../state/selectors/workpad';
// @ts-expect-error unconverted component
import { SidebarHeader } from '../sidebar_header';
import { MultiElementSettings } from './multi_element_settings';
import { GroupSettings } from './group_settings';
import { GlobalConfig } from './global_config';
import { ElementSettings } from './element_settings';
import { State } from '../../../types';

const strings = {
  getGroupedElementSidebarTitle: () =>
    i18n.translate('xpack.canvas.sidebarContent.groupedElementSidebarTitle', {
      defaultMessage: 'Grouped element',
      description:
        'The title displayed when a grouped element is selected. "elements" refer to the different visualizations, images, ' +
        'text, etc that can be added in a Canvas workpad. These elements can be grouped into a larger "grouped element" ' +
        'that contains multiple individual elements.',
    }),
  getMultiElementSidebarTitle: () =>
    i18n.translate('xpack.canvas.sidebarContent.multiElementSidebarTitle', {
      defaultMessage: 'Multiple elements',
      description:
        'The title displayed when multiple elements are selected. "elements" refer to the different visualizations, images, ' +
        'text, etc that can be added in a Canvas workpad.',
    }),
  getSingleElementSidebarTitle: () =>
    i18n.translate('xpack.canvas.sidebarContent.singleElementSidebarTitle', {
      defaultMessage: 'Selected element',
      description:
        'The title displayed when a single element are selected. "element" refer to the different visualizations, images, ' +
        'text, etc that can be added in a Canvas workpad.',
    }),
};

const MultiElementSidebar: React.FC = () => (
  <Fragment>
    <SidebarHeader title={strings.getMultiElementSidebarTitle()} />
    <EuiSpacer />
    <MultiElementSettings />
  </Fragment>
);

const GroupedElementSidebar: React.FC = () => (
  <Fragment>
    <SidebarHeader title={strings.getGroupedElementSidebarTitle()} groupIsSelected />
    <EuiSpacer />
    <GroupSettings />
  </Fragment>
);

const SingleElementSidebar: React.FC<{ selectedElementId: string | null }> = ({
  selectedElementId,
}) => (
  <Fragment>
    <SidebarHeader title={strings.getSingleElementSidebarTitle()} showLayerControls />
    <ElementSettings selectedElementId={selectedElementId} />
  </Fragment>
);

export const SidebarContent: React.FC<{ commit?: Function }> = () => {
  const selectedToplevelNodes = useSelector<State, string[]>((state) =>
    getSelectedToplevelNodes(state)
  );
  const selectedElementId = useSelector<State, string | null>((state) =>
    getSelectedElementId(state)
  );

  if (selectedToplevelNodes.length > 1) {
    return <MultiElementSidebar />;
  }

  if (selectedToplevelNodes.length === 1 && selectedToplevelNodes[0].includes('group')) {
    return <GroupedElementSidebar />;
  }

  if (selectedToplevelNodes.length === 1) {
    return <SingleElementSidebar selectedElementId={selectedElementId} />;
  }

  return <GlobalConfig />;
};
