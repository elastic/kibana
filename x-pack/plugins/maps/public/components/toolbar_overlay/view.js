/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonIcon,
  EuiPopover,
  EuiContextMenu,
  EuiSelectable,
  EuiHighlight,
  EuiTextColor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getIndexPatternsFromIds } from '../../index_pattern_util';
import _ from 'lodash';
import { DRAW_TYPE } from '../../actions/store_actions';
import { ES_GEO_FIELD_TYPE } from '../../../common/constants';

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

  _toggleToolbar = () => {
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

  _onIndexPatternSelection = (options) => {
    if (!this._isMounted) {
      return;
    }

    const selection = options.find((option) => option.checked);
    const drawType = this.state.drawType;
    this.setState(RESET_STATE, () => {
      if (drawType) {
        this.props.initiateDraw({ drawType: drawType, ...selection.value });
      }
    });
  };

  _activateDrawForFirstIndexPattern = (drawType) => {
    if (!this._isMounted) {
      return;
    }
    const indexPatternAndGeofield = this.state.uniqueIndexPatternsAndGeoFields[0];
    this.setState(RESET_STATE, () => {
      this.props.initiateDraw({ drawType: drawType, ...indexPatternAndGeofield });
    });
  };

  componentDidMount() {
    this._isMounted = true;
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  async _getuniqueIndexPatternAndFieldCombos() {
    try {
      const indexPatterns = await getIndexPatternsFromIds(this.props.uniqueIndexPatternIds);
      const uniqueIndexPatternsAndGeofields = [];
      indexPatterns.forEach((indexPattern) => {
        indexPattern.fields.forEach(field => {
          if (field.type === ES_GEO_FIELD_TYPE.GEO_POINT || field.type === ES_GEO_FIELD_TYPE.GEO_SHAPE) {
            uniqueIndexPatternsAndGeofields.push({
              geoField: field.name,
              geoFieldType: field.type,
              indexPatternTitle: indexPattern.title,
              indexPatternId: indexPattern.id
            });
          }
        });
      });
      if (this._isMounted && !_.isEqual(this.state.uniqueIndexPatternsAndGeoFields, uniqueIndexPatternsAndGeofields)) {
        this.setState({
          uniqueIndexPatternsAndGeoFields: uniqueIndexPatternsAndGeofields
        });
      }
    } catch(e) {
      // swallow errors.
      // the Layer-TOC will indicate which layers are disfunctional on a per-layer basis
      return [];
    }
  }

  componentDidUpdate() {
    this._getuniqueIndexPatternAndFieldCombos();
  }

  _getDrawActionsPanel() {

    const drawPolygonAction = {
      name: i18n.translate('xpack.maps.toolbarOverlay.drawShapeLabel', {
        defaultMessage: 'Draw shape to filter data',
      }),
    };

    const drawBoundsAction = {
      name: i18n.translate('xpack.maps.toolbarOverlay.drawBoundsLabel', {
        defaultMessage: 'Draw bounds to filter data',
      }),
    };

    if (this.state.uniqueIndexPatternsAndGeoFields.length === 1) {
      drawPolygonAction.onClick = () => this._activateDrawForFirstIndexPattern(DRAW_TYPE.POLYGON);
      drawBoundsAction.onClick = () => this._activateDrawForFirstIndexPattern(DRAW_TYPE.BOUNDS);
    } else {
      drawPolygonAction.panel = this._getIndexPatternSelectionPanel(1);
      drawPolygonAction.onClick = () => {
        this.setState({ drawType: DRAW_TYPE.POLYGON });
      };
      drawBoundsAction.panel = this._getIndexPatternSelectionPanel(2);
      drawBoundsAction.onClick = () => {
        this.setState({ drawType: DRAW_TYPE.BOUNDS });
      };
    }

    return flattenPanelTree({
      id: 0,
      title: i18n.translate('xpack.maps.toolbarOverlay.tools.toolbarTitle', {
        defaultMessage: 'Tools',
      }),
      items: [drawPolygonAction, drawBoundsAction]
    });
  }

  _getIndexPatternSelectionPanel(id) {
    const options = this.state.uniqueIndexPatternsAndGeoFields.map((indexPatternAndGeoField) => {
      return {
        label: `${indexPatternAndGeoField.indexPatternTitle} : ${indexPatternAndGeoField.geoField}`,
        value: indexPatternAndGeoField
      };
    });

    const renderGeoField = (option, searchValue) => {
      return (
        <Fragment>
          <EuiTextColor color="subdued">
            <small>
              <EuiHighlight search={searchValue}>{option.value.indexPatternTitle}</EuiHighlight>
            </small>
          </EuiTextColor>
          <br />
          <EuiHighlight search={searchValue}>
            {option.value.geoField}
          </EuiHighlight>
        </Fragment>
      );
    };

    const indexPatternSelection = (
      <EuiSelectable
        searchable
        searchProps={{
          placeholder: i18n.translate('xpack.maps.toolbarOverlay.indexPattern.filterListTitle', {
            defaultMessage: 'Filter list',
          }),
          compressed: true,
        }}
        options={options}
        /**
         * *TODO*: FIX this handler as EuiSelectable passes back the full options
         * list with the selected option set with `checked: 'on'`
         */
        onChange={this._onIndexPatternSelection}
        renderOption={renderGeoField}
        listProps={{
          rowHeight: 50,
          showIcons: false,
        }}
      >
        {(list, search) => (
          <div>
            {search}
            {list}
          </div>
        )}
      </EuiSelectable>
    );

    return {
      id: id,
      title: i18n.translate('xpack.maps.toolbarOverlay.geofield.toolbarTitle', {
        defaultMessage: 'Select geo field',
      }),
      content: indexPatternSelection
    };
  }

  _renderToolbarButton() {
    return (
      <EuiButtonIcon
        className="mapToolbarOverlay__button"
        color="text"
        iconType="wrench"
        onClick={this._toggleToolbar}
        aria-label={i18n.translate('xpack.maps.toolbarOverlay.toolbarIconTitle', {
          defaultMessage: 'Tools',
        })}
        title={i18n.translate('xpack.maps.toolbarOverlay.toolbarIconTitle', {
          defaultMessage: 'Tools',
        })}
      />
    );
  }

  render() {

    if (
      !this.props.isFilterable ||
      !this.state.uniqueIndexPatternsAndGeoFields.length
    ) {
      return null;
    }

    return (
      <EuiFlexGroup className="mapToolbarOverlay" responsive={false} direction="row" alignItems="flexEnd" gutterSize="s">
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
