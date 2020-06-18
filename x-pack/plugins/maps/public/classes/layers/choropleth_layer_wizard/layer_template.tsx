/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
import { RenderWizardArguments } from '../../layer_wizard_registry';
import { LayerSelect, OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { getMetricOptionsForLayer, MetricSelect, OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DisplaySelect, DISPLAY } from './display_select';
import { createLayerDescriptor } from './create_layer_descriptor';

export enum BOUNDARIES_SOURCE {
  ELASTICSEARCH = 'ELASTICSEARCH',
  EMS = 'EMS',
}

interface State {
  leftSource: BOUNDARIES_SOURCE;
  leftIndexPatternId: string | null;
  leftEmsFileId: string | null;
  leftKey: string | null;
  rightIndexPatternId: string | null;
  rightKey: string | null;
}

export class LayerTemplate extends Component<RenderWizardArguments, State> {
  state = {
    leftSource: BOUNDARIES_SOURCE.ELASTICSEARCH,
    leftIndexPatternId: null,
    leftEmsFileId: null,
    leftKey: null,
    rightIndexPatternId: null,
    rightKey: null,
  };

  render() {
    return (
      <div>
      </div>
    );
  }
}
