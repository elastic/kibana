/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import classNames from 'classnames';
import {
  EuiButtonIcon,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiText,
  EuiTextAlign,
  EuiSpacer,
} from '@elastic/eui';
import { AddTooltipFieldPopover } from './add_tooltip_field_popover';
import { i18n } from '@kbn/i18n';

// TODO import reorder from EUI once its exposed as service
// https://github.com/elastic/eui/issues/2372
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

const getProps = async field => {
  return new Promise(async (resolve, reject) => {
    try {
      const label = await field.getLabel();
      const type = await field.getDataType();
      resolve({
        label: label,
        type: type,
        name: field.getName(),
      });
    } catch (e) {
      reject(e);
    }
  });
};

export class TooltipSelector extends Component {
  state = {
    fieldProps: [],
    selectedFieldProps: [],
  };

  constructor() {
    super();
    this._isMounted = false;
    this._previousFields = null;
    this._previousSelectedTooltips = null;
  }

  componentDidMount() {
    this._isMounted = true;
    this._loadFieldProps();
    this._loadTooltipFieldProps();
  }

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidUpdate() {
    this._loadTooltipFieldProps();
    this._loadFieldProps();
  }

  async _loadTooltipFieldProps() {
    if (!this.props.tooltipFields || this.props.tooltipFields === this._previousSelectedTooltips) {
      return;
    }

    this._previousSelectedTooltips = this.props.tooltipFields;
    const selectedProps = this.props.tooltipFields.map(getProps);
    const selectedFieldProps = await Promise.all(selectedProps);
    if (this._isMounted) {
      this.setState({ selectedFieldProps });
    }
  }

  async _loadFieldProps() {
    if (!this.props.fields || this.props.fields === this._previousFields) {
      return;
    }

    this._previousFields = this.props.fields;
    const props = this.props.fields.map(getProps);
    const fieldProps = await Promise.all(props);
    if (this._isMounted) {
      this.setState({ fieldProps });
    }
  }

  _getPropertyLabel = propertyName => {
    if (!this.state.fieldProps.length) {
      return propertyName;
    }
    const prop = this.state.fieldProps.find(field => {
      return field.name === propertyName;
    });
    return prop.label ? prop.label : propertyName;
  };

  _getTooltipProperties() {
    return this.props.tooltipFields.map(field => field.getName());
  }

  _onAdd = properties => {
    if (!this.props.tooltipFields) {
      this.props.onChange([...properties]);
    } else {
      const existingProperties = this._getTooltipProperties();
      this.props.onChange([...existingProperties, ...properties]);
    }
  };

  _removeProperty = index => {
    if (!this.props.tooltipFields) {
      this.props.onChange([]);
    } else {
      const tooltipProperties = this._getTooltipProperties();
      tooltipProperties.splice(index, 1);
      this.props.onChange(tooltipProperties);
    }
  };

  _onDragEnd = ({ source, destination }) => {
    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    this.props.onChange(reorder(this._getTooltipProperties(), source.index, destination.index));
  };

  _renderProperties() {
    if (!this.state.selectedFieldProps.length) {
      return null;
    }

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable droppableId="mapLayerTOC" spacing="none">
          {(provided, snapshot) =>
            this.state.selectedFieldProps.map((field, idx) => (
              <EuiDraggable
                spacing="none"
                key={field.name}
                index={idx}
                draggableId={field.name}
                customDragHandle={true}
                disableInteractiveElementBlocking // Allows button to be drag handle
              >
                {(provided, state) => (
                  <div
                    className={classNames('mapTooltipSelector__propertyRow', {
                      'mapTooltipSelector__propertyRow-isDragging': state.isDragging,
                      'mapTooltipSelector__propertyRow-isDraggingOver': snapshot.isDraggingOver,
                    })}
                  >
                    <EuiText className="mapTooltipSelector__propertyContent" size="s">
                      {this._getPropertyLabel(field.name)}
                    </EuiText>
                    <div className="mapTooltipSelector__propertyIcons">
                      <EuiButtonIcon
                        iconType="trash"
                        color="danger"
                        onClick={this._removeProperty.bind(null, idx)}
                        title={i18n.translate('xpack.maps.tooltipSelector.trashButtonTitle', {
                          defaultMessage: 'Remove property',
                        })}
                        aria-label={i18n.translate(
                          'xpack.maps.tooltipSelector.trashButtonAriaLabel',
                          {
                            defaultMessage: 'Remove property',
                          }
                        )}
                      />
                      <EuiButtonIcon
                        className="mapTooltipSelector__grab"
                        iconType="grab"
                        color="subdued"
                        title={i18n.translate('xpack.maps.tooltipSelector.grabButtonTitle', {
                          defaultMessage: 'Reorder property',
                        })}
                        aria-label={i18n.translate(
                          'xpack.maps.tooltipSelector.grabButtonAriaLabel',
                          {
                            defaultMessage: 'Reorder property',
                          }
                        )}
                        {...provided.dragHandleProps}
                      />
                    </div>
                  </div>
                )}
              </EuiDraggable>
            ))
          }
        </EuiDroppable>
      </EuiDragDropContext>
    );
  }

  render() {
    return (
      <div>
        {this._renderProperties()}

        <EuiSpacer size="s" />

        <EuiTextAlign textAlign="center">
          <AddTooltipFieldPopover
            onAdd={this._onAdd}
            fields={this.state.fieldProps}
            selectedFields={this.state.selectedFieldProps}
          />
        </EuiTextAlign>
      </div>
    );
  }
}
