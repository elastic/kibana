/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Filter } from '@kbn/es-query';
import { ActionExecutionContext, Action } from '@kbn/ui-actions-plugin/public';
import { SetViewControl } from './set_view_control';
import { ToolsControl } from './tools_control';
import { FeatureEditTools } from './feature_draw_controls/feature_edit_tools';
import { FitToData } from './fit_to_data';
import { TimesliderToggleButton } from './timeslider_toggle_button';

export interface Props {
  addFilters?: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  showToolsControl: boolean;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  shapeDrawModeActive: boolean;
  pointDrawModeActive: boolean;
  showFitToBoundsButton: boolean;
  showTimesliderButton: boolean;
}

export function ToolbarOverlay(props: Props) {
  const toolsButton =
    props.addFilters && props.showToolsControl ? (
      <EuiFlexItem>
        <ToolsControl
          getFilterActions={props.getFilterActions}
          getActionContext={props.getActionContext}
          disableToolsControl={props.pointDrawModeActive || props.shapeDrawModeActive}
        />
      </EuiFlexItem>
    ) : null;

  const fitToBoundsButton = props.showFitToBoundsButton ? (
    <EuiFlexItem>
      <FitToData />
    </EuiFlexItem>
  ) : null;

  const timesliderToogleButon = props.showTimesliderButton ? (
    <EuiFlexItem>
      <TimesliderToggleButton />
    </EuiFlexItem>
  ) : null;

  const featureDrawControl =
    props.shapeDrawModeActive || props.pointDrawModeActive ? (
      <EuiFlexItem>
        <FeatureEditTools pointsOnly={props.pointDrawModeActive} />
      </EuiFlexItem>
    ) : null;

  return (
    <EuiFlexGroup
      className="mapToolbarOverlay"
      responsive={false}
      direction="column"
      alignItems="flexStart"
      gutterSize="s"
    >
      <EuiFlexItem>
        <SetViewControl />
      </EuiFlexItem>

      {fitToBoundsButton}

      {toolsButton}

      {timesliderToogleButon}

      {featureDrawControl}
    </EuiFlexGroup>
  );
}
