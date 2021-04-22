/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import {
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiPanel,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { ActionExecutionContext, Action } from 'src/plugins/ui_actions/public';
import { DRAW_TYPE, ES_GEO_FIELD_TYPE, ES_SPATIAL_RELATIONS } from '../../../../common/constants';
// @ts-expect-error
import { GeometryFilterForm } from '../../../components/geometry_filter_form';
import { DistanceFilterForm } from '../../../components/distance_filter_form';
import { GeoFieldWithIndex } from '../../../components/geo_field_with_index';
import { DrawState } from '../../../../common/descriptor_types';

const DRAW_SHAPE_LABEL = i18n.translate('xpack.maps.toolbarOverlay.drawShapeLabel', {
  defaultMessage: 'Draw shape to filter data',
});

const DRAW_BOUNDS_LABEL = i18n.translate('xpack.maps.toolbarOverlay.drawBoundsLabel', {
  defaultMessage: 'Draw bounds to filter data',
});

const DRAW_DISTANCE_LABEL = i18n.translate('xpack.maps.toolbarOverlay.drawDistanceLabel', {
  defaultMessage: 'Draw distance to filter data',
});

const DRAW_SHAPE_LABEL_SHORT = i18n.translate('xpack.maps.toolbarOverlay.drawShapeLabelShort', {
  defaultMessage: 'Draw shape',
});

const DRAW_BOUNDS_LABEL_SHORT = i18n.translate('xpack.maps.toolbarOverlay.drawBoundsLabelShort', {
  defaultMessage: 'Draw bounds',
});

const DRAW_DISTANCE_LABEL_SHORT = i18n.translate(
  'xpack.maps.toolbarOverlay.drawDistanceLabelShort',
  {
    defaultMessage: 'Draw distance',
  }
);

export interface Props {
  cancelDraw: () => void;
  geoFields: GeoFieldWithIndex[];
  initiateDraw: (drawState: DrawState) => void;
  isDrawingFilter: boolean;
  getFilterActions?: () => Promise<Action[]>;
  getActionContext?: () => ActionExecutionContext;
}

interface State {
  isPopoverOpen: boolean;
}

export class ToolsControl extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  _togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  _closePopover = () => {
    this.setState({ isPopoverOpen: false });
  };

  _initiateShapeDraw = (options: {
    actionId: string;
    geometryLabel: string;
    indexPatternId: string;
    geoFieldName: string;
    geoFieldType: ES_GEO_FIELD_TYPE;
    relation: ES_SPATIAL_RELATIONS;
  }) => {
    this.props.initiateDraw({
      drawType: DRAW_TYPE.POLYGON,
      ...options,
    });
    this._closePopover();
  };

  _initiateBoundsDraw = (options: {
    actionId: string;
    geometryLabel: string;
    indexPatternId: string;
    geoFieldName: string;
    geoFieldType: ES_GEO_FIELD_TYPE;
    relation: ES_SPATIAL_RELATIONS;
  }) => {
    this.props.initiateDraw({
      drawType: DRAW_TYPE.BOUNDS,
      ...options,
    });
    this._closePopover();
  };

  _initiateDistanceDraw = (options: {
    actionId: string;
    filterLabel: string;
    indexPatternId: string;
    geoFieldName: string;
  }) => {
    this.props.initiateDraw({
      drawType: DRAW_TYPE.DISTANCE,
      ...options,
    });
    this._closePopover();
  };

  _getDrawPanels() {
    const tools = [
      {
        name: DRAW_SHAPE_LABEL,
        panel: 1,
      },
      {
        name: DRAW_BOUNDS_LABEL,
        panel: 2,
      },
      {
        name: DRAW_DISTANCE_LABEL,
        panel: 3,
      },
    ];

    return [
      {
        id: 0,
        title: i18n.translate('xpack.maps.toolbarOverlay.tools.toolbarTitle', {
          defaultMessage: 'Tools',
        }),
        items: tools,
      },
      {
        id: 1,
        title: DRAW_SHAPE_LABEL_SHORT,
        content: (
          <GeometryFilterForm
            className="mapDrawControl__geometryFilterForm"
            buttonLabel={DRAW_SHAPE_LABEL_SHORT}
            geoFields={this.props.geoFields}
            getFilterActions={this.props.getFilterActions}
            getActionContext={this.props.getActionContext}
            intitialGeometryLabel={i18n.translate(
              'xpack.maps.toolbarOverlay.drawShape.initialGeometryLabel',
              {
                defaultMessage: 'shape',
              }
            )}
            onSubmit={this._initiateShapeDraw}
          />
        ),
      },
      {
        id: 2,
        title: DRAW_BOUNDS_LABEL_SHORT,
        content: (
          <GeometryFilterForm
            className="mapDrawControl__geometryFilterForm"
            buttonLabel={DRAW_BOUNDS_LABEL_SHORT}
            geoFields={this.props.geoFields}
            getFilterActions={this.props.getFilterActions}
            getActionContext={this.props.getActionContext}
            intitialGeometryLabel={i18n.translate(
              'xpack.maps.toolbarOverlay.drawBounds.initialGeometryLabel',
              {
                defaultMessage: 'bounds',
              }
            )}
            onSubmit={this._initiateBoundsDraw}
          />
        ),
      },
      {
        id: 3,
        title: DRAW_DISTANCE_LABEL_SHORT,
        content: (
          <DistanceFilterForm
            className="mapDrawControl__geometryFilterForm"
            buttonLabel={DRAW_DISTANCE_LABEL_SHORT}
            geoFields={this.props.geoFields}
            getFilterActions={this.props.getFilterActions}
            getActionContext={this.props.getActionContext}
            onSubmit={this._initiateDistanceDraw}
          />
        ),
      },
    ];
  }

  _renderToolsButton() {
    return (
      <EuiPanel paddingSize="none" className="mapToolbarOverlay__button">
        <EuiButtonIcon
          size="s"
          color="text"
          iconType="wrench"
          onClick={this._togglePopover}
          aria-label={i18n.translate('xpack.maps.toolbarOverlay.toolsControlTitle', {
            defaultMessage: 'Tools',
          })}
          title={i18n.translate('xpack.maps.toolbarOverlay.toolsControlTitle', {
            defaultMessage: 'Tools',
          })}
        />
      </EuiPanel>
    );
  }

  render() {
    const toolsPopoverButton = (
      <EuiPopover
        id="toolsControlPopover"
        button={this._renderToolsButton()}
        isOpen={this.state.isPopoverOpen}
        closePopover={this._closePopover}
        panelPaddingSize="none"
        anchorPosition="leftUp"
      >
        <EuiContextMenu initialPanelId={0} panels={this._getDrawPanels()} />
      </EuiPopover>
    );

    if (!this.props.isDrawingFilter) {
      return toolsPopoverButton;
    }

    return (
      <EuiFlexGroup gutterSize="s">
        <EuiFlexItem>{toolsPopoverButton}</EuiFlexItem>
        <EuiFlexItem>
          <EuiButton size="s" fill onClick={this.props.cancelDraw}>
            <FormattedMessage
              id="xpack.maps.tooltip.toolsControl.cancelDrawButtonLabel"
              defaultMessage="Cancel"
            />
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
