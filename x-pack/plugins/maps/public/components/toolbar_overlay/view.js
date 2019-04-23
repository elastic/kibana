/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiSuperSelect
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternsFromIds } from '../../index_pattern_util';
import _ from 'lodash';
import { DRAW_STATE_DRAW_TYPE } from '../../actions/store_actions';

const RESET_STATE = {
  isPopoverOpen: false,
  drawType: null
};

export class ToolbarOverlay extends React.Component {


  state = {
    isPopoverOpen: false,
    uniqueIndexPatternsAndGeoFields: [],
    drawType: null
  };

  _onClick = () => {
    if (!this._isMounted) {
      return;
    }
    this.setState(prevState => ({
      isPopoverOpen: !prevState.isPopoverOpen,
      drawType: null
    }));
  };

  _closePopover = () => {
    if (!this._isMounted) {
      return;
    }
    this.setState(RESET_STATE);
  };

  _onIndexPatternSelection = (e) => {
    if (!this._isMounted) {
      return;
    }
    const drawType = this.state.drawType;
    this.setState(RESET_STATE, () => {
      if (drawType) {
        this.props.initiateDraw({ drawType: drawType, ...e });
      }
    });
  };

  _showIndexPatternSelection = (drawType) => {
    if (!this._isMounted) {
      return;
    }
    this.setState({
      drawType: drawType
    });
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _getuniqueIndexPatternAndFieldCombos() {
    const indexPatterns = await getIndexPatternsFromIds(this.props.uniqueIndexPatternIds);
    try {
      const uniqueIndexPatternsAndGeofields = [];
      indexPatterns.forEach((indexPattern) => {
        indexPattern.fields.forEach(field => {
          if (field.type !== 'geo_point') {
            return;
          }
          uniqueIndexPatternsAndGeofields.push({
            geoField: field.name,
            indexPatternTitle: indexPattern.title,
            indexPatternId: indexPattern.id
          });
        });
      });
      if (this._isMounted && !_.isEqual(this.state.uniqueIndexPatternsAndGeoFields, uniqueIndexPatternsAndGeofields)) {
        this.setState({
          uniqueIndexPatternsAndGeoFields: uniqueIndexPatternsAndGeofields
        });
      }
    } catch(e) {
      console.error(e);
      throw e;
    }
  }

  componentDidUpdate() {
    this._getuniqueIndexPatternAndFieldCombos();
  }

  _getDrawActionsPanel() {
    const actionItems = [
      {
        name: i18n.translate('xpack.maps.toolbarOverlay.drawShapeLabel', {
          defaultMessage: 'Draw shape',
        }),
        toolTipContent: i18n.translate('xpack.maps.toolbarOverlay.drawShapeTooltip', {
          defaultMessage: 'Draw shape to filter data from index pattern',
        }),
        panel: this._getIndexPatternSelectionPanel(1),
        onClick: () => this._showIndexPatternSelection(DRAW_STATE_DRAW_TYPE.POLYGON)
      },
      {
        name: i18n.translate('xpack.maps.toolbarOverlay.drawBoundsLabel', {
          defaultMessage: 'Draw bounds',
        }),
        toolTipContent: i18n.translate('xpack.maps.toolbarOverlay.drawBoundsTooltip', {
          defaultMessage: 'Draw bounds to filter data from index pattern',
        }),
        panel: this._getIndexPatternSelectionPanel(2),
        onClick: () => this._showIndexPatternSelection(DRAW_STATE_DRAW_TYPE.BOUNDS)
      }
    ];

    return flattenPanelTree({
      id: 0,
      title: i18n.translate('xpack.maps.toolbarOverlay.toolvbarTitle', {
        defaultMessage: 'Tools',
      }),
      items: actionItems
    });
  }

  _getIndexPatternSelectionPanel(id) {
    const options = this.state.uniqueIndexPatternsAndGeoFields.map((indexPatternAndGeoField) => {
      return {
        inputDisplay: <EuiText><p>{`${indexPatternAndGeoField.indexPatternTitle} . ${indexPatternAndGeoField.geoField}`}</p></EuiText>,
        value: indexPatternAndGeoField
      };
    });

    const indexPatternSelection = (
      <EuiSuperSelect
        options={options}
        onChange={this._onIndexPatternSelection}
      />
    );

    return {
      id: id,
      title: i18n.translate('xpack.maps.toolbarOverlay.toolbarTitle', {
        defaultMessage: 'Select geo field',
      }),
      content: indexPatternSelection
    };
  }

  _renderToolbarButton() {
    return (
      <EuiButtonIcon
        iconType="wrench"
        onClick={this._onClick}
      />
    );
  }

  render() {

    if (!this.props.isReadOnly) {
      return null;
    }

    return (
      <EuiFlexGroup className="toolbarOverlay" responsive={false} direction="row" alignItems="flexEnd" gutterSize="s">
        <EuiFlexItem>
          <EuiPopover
            id="contextMenu"
            button={this._renderToolbarButton()}
            isOpen={this.state.isPopoverOpen}
            closePopover={this._closePopover}
            panelPaddingSize="none"
            withTitle
            anchorPosition="leftUp"
          >
            <EuiContextMenu
              initialPanelId={0}
              panels={this._getDrawActionsPanel()}
            />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}


function flattenPanelTree(tree, array = []) {
  array.push(tree);

  if (tree.items) {
    tree.items.forEach(item => {
      if (item.panel) {
        flattenPanelTree(item.panel, array);
        item.panel = item.panel.id;
      }
    });
  }

  return array;
}
