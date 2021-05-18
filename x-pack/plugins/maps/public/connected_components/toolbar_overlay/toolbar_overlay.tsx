/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Filter } from 'src/plugins/data/public';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { SetViewControl } from './set_view_control';
import { ToolsControl } from './tools_control';
import { FeatureDrawControl } from './feature_draw_controls/feature_draw_control';
import { FitToData } from './fit_to_data';
import { GeoFieldWithIndex } from '../../components/geo_field_with_index';

export interface Props {
  addFilters?: ((filters: Filter[], actionId: string) => Promise<void>) | null;
  geoFields: GeoFieldWithIndex[];
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
  showEditButton: boolean;
  shapeDrawModeActive: boolean;
  pointDrawModeActive: boolean;
  cancelEditing: () => void;
}

export function ToolbarOverlay(props: Props) {
  function renderToolsControl() {
    const {
      addFilters,
      geoFields,
      getFilterActions,
      getActionContext,
      shapeDrawModeActive,
      pointDrawModeActive,
    } = props;
    if (!addFilters || !geoFields.length || shapeDrawModeActive || pointDrawModeActive) {
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

  function renderFeatureDrawControl() {
    return props.shapeDrawModeActive || props.pointDrawModeActive ? (
      <>
        <EuiFlexItem>
          <FeatureDrawControl pointsOnly={props.pointDrawModeActive} />
        </EuiFlexItem>
        <EuiFlexItem key={'cancel'} grow={false}>
          <EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
            <EuiButtonIcon
              size="s"
              onClick={props.cancelEditing}
              iconType="exit"
              aria-label={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.cancelDraw', {
                defaultMessage: 'Exit feature editing',
              })}
              title={i18n.translate('xpack.maps.toolbarOverlay.featureDraw.cancelDrawTitle', {
                defaultMessage: 'Exit feature editing',
              })}
            />
          </EuiPanel>
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

      {renderFeatureDrawControl()}
    </EuiFlexGroup>
  );
}
