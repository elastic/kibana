/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { MBMapContainer } from '../map/mb';
import { LayerControl } from '../layer_control/index';


export function GISApp() {
  return (
    <div className="wrapper">
      <MBMapContainer/>
      <LayerControl/>
    </div>
  );
}
