/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { compose, branch, renderComponent } from 'recompose';
import { SidebarComponent } from './sidebar_component';
import { GlobalConfig } from './global_config';

const branches = [branch(props => !props.selectedElement, renderComponent(GlobalConfig))];

export const Sidebar = compose(...branches)(SidebarComponent);
