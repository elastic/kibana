/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Filter } from 'src/plugins/data/public';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { SetViewControl } from './set_view_control';
import { ToolsControl } from './tools_control';
import { FeatureDrawControl } from './feature_draw_controls/feature_draw_control';
import { FeatureEditControl } from './feature_draw_controls/feature_edit_control';
import { FitToData } from './fit_to_data';
import { GeoFieldWithIndex } from '../../components/geo_field_with_index';
import { EditControl } from './edit_control';

export interface Props {
  addFilters?: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  geoFields: GeoFieldWithIndex[];
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  addDrawLayerInProgress: boolean;
  editModeActive: boolean;
}

export function ToolbarOverlay(props: Props) {
  function renderToolsControl() {
    const { addFilters, geoFields, getFilterActions, getActionContext } = props;
    if (!addFilters || !geoFields.length) {
      return null;
    }

    return (
      <EuiFlexItem>
        <ToolsControl
          geoFields={geoFields}
          getFilterActions={getFilterActions}
          getActionContext={getActionContext}
        />
      </EuiFlexItem>
    );
  }

  function renderEditControl() {
    const { geoFields } = props;
    if (!geoFields.length || props.addDrawLayerInProgress) {
      return null;
    }

    return (
      <EuiFlexItem>
        <EditControl geoFields={geoFields} />
      </EuiFlexItem>
    );
  }

  function renderFeatureDrawAndEditControls() {
    return props.showEditButton ? (
      <>
        <EuiFlexItem>
          <FeatureDrawControl />
        </EuiFlexItem>
        <EuiFlexItem>
          <FeatureEditControl />
        </EuiFlexItem>
      </>
    ) : null;
  }

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

      <EuiFlexItem>
        <FitToData />
      </EuiFlexItem>

      {renderToolsControl()}

      {renderEditControl()}

      {renderFeatureDrawAndEditControls()}
    </EuiFlexGroup>
  );
}
