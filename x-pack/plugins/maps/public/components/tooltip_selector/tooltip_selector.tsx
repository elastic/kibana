/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component, Fragment } from 'react';
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
import { i18n } from '@kbn/i18n';
import { AddTooltipFieldPopover, FieldProps } from './add_tooltip_field_popover';
import { IField } from '../../classes/fields/field';

// TODO import reorder from EUI once its exposed as service
// https://github.com/elastic/eui/issues/2372
const reorder = (list: string[], startIndex: number, endIndex: number) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  return result;
};

async function getFieldProps(field: IField): Promise<FieldProps> {
  return {
    label: await field.getLabel(),
    type: await field.getDataType(),
    name: field.getName(),
  };
}

interface Props {
  fields: IField[] | null;
  onChange: (selectedFieldNames: string[]) => void;
  tooltipFields: IField[];
}

interface State {
  fieldProps: FieldProps[];
  selectedFieldProps: FieldProps[];
}

export class TooltipSelector extends Component<Props, State> {
  private _isMounted: boolean;
  private _previousFields: IField[] | null;
  private _previousSelectedTooltips: IField[] | null;

  state = {
    fieldProps: [],
    selectedFieldProps: [],
  };

  constructor(props: Props) {
    super(props);
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
    const promises = this.props.tooltipFields.map(getFieldProps);
    const selectedFieldProps = await Promise.all(promises);
    if (this._isMounted) {
      this.setState({ selectedFieldProps });
    }
  }

  async _loadFieldProps() {
    if (!this.props.fields || this.props.fields === this._previousFields) {
      return;
    }

    this._previousFields = this.props.fields;
    const promises = this.props.fields.map(getFieldProps);
    const fieldProps = await Promise.all(promises);
    if (this._isMounted) {
      this.setState({ fieldProps });
    }
  }

  _getPropertyLabel = (propertyName: string) => {
    if (!this.state.fieldProps.length) {
      return propertyName;
    }
    const prop: FieldProps | undefined = this.state.fieldProps.find((field: FieldProps) => {
      return field.name === propertyName;
    });
    return prop ? prop!.label : propertyName;
  };

  _getTooltipFieldNames(): string[] {
    return this.props.tooltipFields ? this.props.tooltipFields.map((field) => field.getName()) : [];
  }

  _onAdd = (properties: string[]) => {
    if (!this.props.tooltipFields) {
      this.props.onChange([...properties]);
    } else {
      const existingProperties = this._getTooltipFieldNames();
      this.props.onChange([...existingProperties, ...properties]);
    }
  };

  _removeProperty = (index: number) => {
    if (!this.props.tooltipFields) {
      this.props.onChange([]);
    } else {
      const tooltipProperties = this._getTooltipFieldNames();
      tooltipProperties.splice(index, 1);
      this.props.onChange(tooltipProperties);
    }
  };

  _onDragEnd = ({
    source,
    destination,
  }: {
    source: { index: number };
    destination?: { index: number };
  }) => {
    // Dragging item out of EuiDroppable results in destination of null
    if (!destination) {
      return;
    }

    this.props.onChange(reorder(this._getTooltipFieldNames(), source.index, destination.index));
  };

  _renderProperties() {
    if (!this.state.selectedFieldProps.length) {
      return null;
    }

    return (
      <EuiDragDropContext onDragEnd={this._onDragEnd}>
        <EuiDroppable droppableId="mapLayerTOC" spacing="none">
          {(droppableProvided, snapshot) => (
            <Fragment>
              {this.state.selectedFieldProps.map((field: FieldProps, idx: number) => (
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
              ))}
            </Fragment>
          )}
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
