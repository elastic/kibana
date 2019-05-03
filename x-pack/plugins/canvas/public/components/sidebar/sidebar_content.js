/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { compose, branch, renderComponent } from 'recompose';
import { getSelectedToplevelNodes, getSelectedElementId } from '../../state/selectors/workpad';
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
    renderComponent(GlobalConfig)
  ),
  // multiple elements selected
  branch(
    ({ selectedToplevelNodes }) => selectedToplevelNodes.length > 1,
    renderComponent(MultiElementSettings)
  ),
  // a single, grouped element is selected
  branch(
    ({ selectedToplevelNodes }) =>
      selectedToplevelNodes.length === 1 && selectedToplevelNodes[0].includes('group'),
    renderComponent(GroupSettings)
  ),
];

export const SidebarContent = compose(
  connect(mapStateToProps),
  ...branches
)(ElementSettings);
