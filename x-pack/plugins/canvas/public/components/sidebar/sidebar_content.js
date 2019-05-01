/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { EuiSpacer } from '@elastic/eui';
import { getSelectedToplevelNodes, getSelectedElementId } from '../../state/selectors/workpad';
import { SidebarHeader } from '../sidebar_header/sidebar_header';
import { MultiElementSettings } from './multi_element_settings';
import { GroupSettings } from './group_settings';
import { GlobalConfig } from './global_config';
import { ElementSettings } from './element_settings';

const mapStateToProps = state => ({
  selectedToplevelNodes: getSelectedToplevelNodes(state),
  selectedElementId: getSelectedElementId(state),
});

const branches = [
  // no elements selected
  branch(
    ({ selectedToplevelNodes }) => !selectedToplevelNodes.length,
    renderComponent(() => (
      <>
        <GlobalConfig />
      </>
    ))
  ),
  // multiple elements selected
  branch(
    ({ selectedToplevelNodes }) => selectedToplevelNodes.length > 1,
    renderComponent(() => (
      <>
        <SidebarHeader title="Multiple elements" />
        <EuiSpacer />
        <MultiElementSettings />
      </>
    ))
  ),
  // a single, grouped element is selected
  branch(
    ({ selectedToplevelNodes }) =>
      selectedToplevelNodes.length === 1 && selectedToplevelNodes[0].includes('group'),
    renderComponent(() => (
      <>
        <SidebarHeader title="Grouped element" groupIsSelected />
        <EuiSpacer />
        <GroupSettings />
      </>
    ))
  ),
];

export const SidebarContent = compose(
  connect(mapStateToProps),
  ...branches
)(() => (
  <>
    <SidebarHeader title="Selected element" showLayerControls />
    <ElementSettings />
  </>
));
