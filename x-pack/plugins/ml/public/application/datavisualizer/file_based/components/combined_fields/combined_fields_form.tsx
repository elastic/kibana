/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import React, { Component } from 'react';

import { EuiText, EuiFormRow, EuiPopover, EuiContextMenu, EuiButtonEmpty } from '@elastic/eui';

import { CombinedField } from './types';
import { GeoPointForm } from './geo_point';
import { addCombinedFieldsToMappings, addCombinedFieldsToPipeline } from './utils';

interface Props {
  mappingsString: string;
  pipelineString: string;
  onMappingsStringChange(): void;
  onPipelineStringChange(): void;
  combinedFields: CombinedField[];
  onCombinedFieldsChange(combinedFields: CombinedField[]): void;
  results: unknown;
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

  addCombinedField = (combinedField) => {
    let mappings;
    try {
      mappings = JSON.parse(this.props.mappingsString);
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.ml.fileDatavisualizer.combinedFieldsForm.mappingsParseError', {
          defaultMessage: 'Error parsing mappings: {error}',
          values: { error: error.message },
        })
      );
    }

    let pipeline;
    try {
      pipeline = JSON.parse(this.props.pipelineString);
    } catch (error) {
      throw new Error(
        i18n.translate('xpack.ml.fileDatavisualizer.combinedFieldsForm.pipelineParseError', {
          defaultMessage: 'Error parsing pipeline: {error}',
          values: { error: error.message },
        })
      );
    }

    this.props.onMappingsStringChange(
      JSON.stringify(addCombinedFieldsToMappings(mappings, [combinedField]), null, 2)
    );
    this.props.onPipelineStringChange(
      JSON.stringify(addCombinedFieldsToPipeline(pipeline, [combinedField]), null, 2)
    );
    this.props.onCombinedFieldsChange([...this.props.combinedFields, combinedField]);

    this.closePopover();
  };

  render() {
    const geoPointLabel = i18n.translate('xpack.ml.fileDatavisualizer.geoPointCombinedFieldLabel', {
      defaultMessage: 'Add geo point field',
    });
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
          <GeoPointForm addCombinedField={this.addCombinedField} results={this.props.results} />
        ),
      },
    ];
    return (
      <EuiFormRow
        label={
          <FormattedMessage
            id="xpack.ml.fileDatavisualizer.combinedFieldsLabel"
            defaultMessage="Combined fields"
          />
        }
      >
        <div>
          {this.props.combinedFields.map((combinedField: CombinedField, idx: number) => (
            <EuiText key={idx} size="s">
              {getCombinedFieldLabel(combinedField)}
            </EuiText>
          ))}
          <EuiPopover
            id="combineFieldsPopover"
            button={
              <EuiButtonEmpty onClick={this.togglePopover} size="xs" iconType="plusInCircleFilled">
                <FormattedMessage
                  id="xpack.ml.fileDatavisualizer.addCombinedFieldsLabel"
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

function getCombinedFieldLabel(combinedField: CombinedField) {
  return `${combinedField.fieldNames.join(combinedField.delimiter)} => ${
    combinedField.combinedFieldName
  } as ${combinedField.mappingType}`;
}
