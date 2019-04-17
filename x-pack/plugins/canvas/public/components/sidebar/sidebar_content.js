/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { EuiSpacer } from '@elastic/eui';
import { ComponentStrings } from '../../../i18n';
import { globalStateUpdater } from '../workpad_page/integration_utils';
import { getSelectedToplevelNodes, getSelectedElementId } from '../../state/selectors/workpad';
import { SidebarHeader } from '../sidebar_header';
import { MultiElementSettings } from './multi_element_settings';
import { GroupSettings } from './group_settings';
import { GlobalConfig } from './global_config';
import { ElementSettings } from './element_settings';

const { SidebarContent: strings } = ComponentStrings;

const mapStateToProps = (state) => ({
  selectedToplevelNodes: getSelectedToplevelNodes(state),
  selectedElementId: getSelectedElementId(state),
});

const mergeProps = (
  { state, ...restStateProps },
  { dispatch, ...restDispatchProps },
  ownProps
) => ({
  ...ownProps,
  ...restDispatchProps,
  ...restStateProps,
  updateGlobalState: globalStateUpdater(dispatch, state),
});

const withGlobalState = (commit, updateGlobalState) => (type, payload) => {
  const newLayoutState = commit(type, payload);
  if (newLayoutState.currentScene.gestureEnd) {
    updateGlobalState(newLayoutState);
  }
};

const MultiElementSidebar = ({ commit, updateGlobalState, selectedToplevelNodes }) => (
  <Fragment>
    <SidebarHeader
      title={strings.getMultiElementSidebarTitle()}
      commit={withGlobalState(commit, updateGlobalState)}
    />
    <MultiElementSettings selectedToplevelNodes={selectedToplevelNodes} />
  </Fragment>
);

const GroupedElementSidebar = () => (
  <Fragment>
    <SidebarHeader title={strings.getGroupedElementSidebarTitle()} groupIsSelected />
    <EuiSpacer />
    <GroupSettings />
  </Fragment>
);

const SingleElementSidebar = ({ selectedElementId }) => (
  <Fragment>
    <SidebarHeader title={strings.getSingleElementSidebarTitle()} showLayerControls />
    <ElementSettings selectedElementId={selectedElementId} />
  </Fragment>
);

const branches = [
  // multiple elements are selected
  branch(
    ({ selectedToplevelNodes }) => selectedToplevelNodes.length > 1,
    renderComponent(MultiElementSidebar)
  ),
  // a single, grouped element is selected
  branch(
    ({ selectedToplevelNodes }) =>
      selectedToplevelNodes.length === 1 && selectedToplevelNodes[0].includes('group'),
    renderComponent(GroupedElementSidebar)
  ),
  // a single element is selected
  branch(
    ({ selectedToplevelNodes }) => selectedToplevelNodes.length === 1,
    renderComponent(SingleElementSidebar)
  ),
];

export const SidebarContent = compose(
  connect(mapStateToProps, mergeProps),
  ...branches
)(GlobalConfig);
