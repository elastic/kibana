/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { Component } from 'react';

import {
  EuiFormRow,
  EuiPopover,
  EuiContextMenu,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
} from '@elastic/eui';

import { FindFileStructureResponse } from '@kbn/file-upload-plugin/common';
import { CombinedField } from './types';
import { GeoPointForm } from './geo_point';
import { CombinedFieldLabel } from './combined_field_label';
import {
  addCombinedFieldsToMappings,
  addCombinedFieldsToPipeline,
  getNameCollisionMsg,
  removeCombinedFieldsFromMappings,
  removeCombinedFieldsFromPipeline,
} from './utils';

interface Props {
  mappingsString: string;
  pipelineString: string;
  onMappingsStringChange(mappings: string): void;
  onPipelineStringChange(pipeline: string): void;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  results: FindFileStructureResponse;
  isDisabled: boolean;
}

interface State {
  isPopoverOpen: boolean;
}

export class CombinedFieldsForm extends Component<Props, State> {
  state: State = {
    isPopoverOpen: false,
  };

  togglePopover = () => {
    this.setState((prevState) => ({
      isPopoverOpen: !prevState.isPopoverOpen,
    }));
  };

  closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  addCombinedField = (combinedField: CombinedField) => {
    if (this.hasNameCollision(combinedField.combinedFieldName)) {
      throw new Error(getNameCollisionMsg(combinedField.combinedFieldName));
    }

    const mappings = this.parseMappings();
    const pipeline = this.parsePipeline();

    this.props.onMappingsStringChange(
      JSON.stringify(addCombinedFieldsToMappings(mappings, [combinedField]), null, 2)
    );
    this.props.onPipelineStringChange(
      JSON.stringify(addCombinedFieldsToPipeline(pipeline, [combinedField]), null, 2)
    );
    this.props.onCombinedFieldsChange([...this.props.combinedFields, combinedField]);

    this.closePopover();
  };

  removeCombinedField = (index: number) => {
    let mappings;
    let pipeline;
    try {
      mappings = this.parseMappings();
      pipeline = this.parsePipeline();
    } catch (error) {
      // how should remove error be surfaced?
      return;
    }

    const updatedCombinedFields = [...this.props.combinedFields];
    const removedCombinedFields = updatedCombinedFields.splice(index, 1);

    this.props.onMappingsStringChange(
      JSON.stringify(removeCombinedFieldsFromMappings(mappings, removedCombinedFields), null, 2)
    );
    this.props.onPipelineStringChange(
      JSON.stringify(removeCombinedFieldsFromPipeline(pipeline, removedCombinedFields), null, 2)
    );
    this.props.onCombinedFieldsChange(updatedCombinedFields);
  };

  parseMappings() {
    try {
      return JSON.parse(this.props.mappingsString);
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.dataVisualizer.combinedFieldsForm.mappingsParseError', {
          defaultMessage: 'Error parsing mappings: {error}',
          values: { error: error.message },
        })
      );
    }
  }

  parsePipeline() {
    try {
      return JSON.parse(this.props.pipelineString);
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.dataVisualizer.combinedFieldsForm.pipelineParseError', {
          defaultMessage: 'Error parsing pipeline: {error}',
          values: { error: error.message },
        })
      );
    }
  }

  hasNameCollision = (name: string) => {
    if (this.props.results.column_names?.includes(name)) {
      // collision with column name
      return true;
    }

    if (
      this.props.combinedFields.some((combinedField) => combinedField.combinedFieldName === name)
    ) {
      // collision with combined field name
      return true;
    }

    const mappings = this.parseMappings();
    return mappings.properties.hasOwnProperty(name);
  };

  render() {
    const geoPointLabel = i18n.translate(
      'xpack.dataVisualizer.file.geoPointForm.combinedFieldLabel',
      {
        defaultMessage: 'Add geo point field',
      }
    );
    const panels = [
      {
        id: 0,
        items: [
          {
            name: geoPointLabel,
            panel: 1,
          },
        ],
      },
      {
        id: 1,
        title: geoPointLabel,
        content: (
          <GeoPointForm
            addCombinedField={this.addCombinedField}
            hasNameCollision={this.hasNameCollision}
            results={this.props.results}
          />
        ),
      },
    ];
    return (
      <EuiFormRow
        label={i18n.translate('xpack.dataVisualizer.combinedFieldsLabel', {
          defaultMessage: 'Combined fields',
        })}
      >
        <div>
          {this.props.combinedFields.map((combinedField: CombinedField, idx: number) => (
            <EuiFlexGroup key={idx} gutterSize="s">
              <EuiFlexItem>
                <CombinedFieldLabel combinedField={combinedField} />
              </EuiFlexItem>
              {!this.props.isDisabled && (
                <EuiFlexItem grow={false}>
                  <EuiButtonIcon
                    iconType="trash"
                    color="danger"
                    onClick={this.removeCombinedField.bind(null, idx)}
                    title={i18n.translate('xpack.dataVisualizer.removeCombinedFieldsLabel', {
                      defaultMessage: 'Remove combined field',
                    })}
                    aria-label={i18n.translate('xpack.dataVisualizer.removeCombinedFieldsLabel', {
                      defaultMessage: 'Remove combined field',
                    })}
                  />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          ))}
          <EuiPopover
            id="combineFieldsPopover"
            button={
              <EuiButtonEmpty
                onClick={this.togglePopover}
                size="xs"
                iconType="plusInCircleFilled"
                isDisabled={this.props.isDisabled}
              >
                <FormattedMessage
                  id="xpack.dataVisualizer.addCombinedFieldsLabel"
                  defaultMessage="Add combined field"
                />
              </EuiButtonEmpty>
            }
            isOpen={this.state.isPopoverOpen}
            closePopover={this.closePopover}
            anchorPosition="rightCenter"
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </div>
      </EuiFormRow>
    );
  }
}
