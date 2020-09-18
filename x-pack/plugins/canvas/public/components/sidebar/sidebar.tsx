/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent } from 'react';
// @ts-expect-error unconverted component
import { SidebarContent } from './sidebar_content';

interface Props {
  commit: Function;
}

export const Sidebar: FunctionComponent<Props> = ({ commit }) => {
  return (
    <div className="canvasSidebar">
      <SidebarContent commit={commit} />
    </div>
  );
};
