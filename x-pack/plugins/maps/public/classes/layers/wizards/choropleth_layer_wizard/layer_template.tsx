/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Component } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { FileLayer } from '@elastic/ems-client';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiPanel,
  EuiRadioGroup,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { DataViewField, DataView } from '@kbn/data-plugin/common';
import { getDataViewLabel, getDataViewSelectPlaceholder } from '../../../../../common/i18n_getters';
import { RenderWizardArguments } from '../layer_wizard_registry';
import { EMSFileSelect } from '../../../../components/ems_file_select';
import { GeoIndexPatternSelect } from '../../../../components/geo_index_pattern_select';
import { SingleFieldSelect } from '../../../../components/single_field_select';
import { getGeoFields, getSourceFields, getTermsFields } from '../../../../index_pattern_util';
import { getEmsFileLayers } from '../../../../util';
import {
  getIndexPatternSelectComponent,
  getIndexPatternService,
} from '../../../../kibana_services';
import {
  createEmsChoroplethLayerDescriptor,
  createEsChoroplethLayerDescriptor,
} from './create_choropleth_layer_descriptor';

export enum BOUNDARIES_SOURCE {
  ELASTICSEARCH = 'ELASTICSEARCH',
  EMS = 'EMS',
}

const BOUNDARIES_OPTIONS = [
  {
    id: BOUNDARIES_SOURCE.EMS,
    label: i18n.translate('xpack.maps.choropleth.boundaries.ems', {
      defaultMessage: 'Administrative boundaries from the Elastic Maps Service',
    }),
  },
  {
    id: BOUNDARIES_SOURCE.ELASTICSEARCH,
    label: i18n.translate('xpack.maps.choropleth.boundaries.elasticsearch', {
      defaultMessage: 'Points, lines, and polygons from Elasticsearch',
    }),
  },
];

interface State {
  leftSource: BOUNDARIES_SOURCE;
  leftEmsFileId: string | null;
  leftEmsFields: Array<EuiComboBoxOptionOption<string>>;
  leftIndexPattern: DataView | null;
  leftGeoFields: DataViewField[];
  leftJoinFields: DataViewField[];
  leftGeoField: string | null;
  leftEmsJoinField: string | null;
  leftElasticsearchJoinField: string | null;
  rightIndexPatternId: string;
  rightIndexPatternTitle: string | null;
  rightTermsFields: DataViewField[];
  rightJoinField: string | null;
}

export class LayerTemplate extends Component<RenderWizardArguments, State> {
  private _isMounted: boolean = false;

  state = {
    leftSource: BOUNDARIES_SOURCE.EMS,
    leftEmsFileId: null,
    leftEmsFields: [],
    leftIndexPattern: null,
    leftGeoFields: [],
    leftJoinFields: [],
    leftGeoField: null,
    leftEmsJoinField: null,
    leftElasticsearchJoinField: null,
    rightIndexPatternId: '',
    rightIndexPatternTitle: null,
    rightTermsFields: [],
    rightJoinField: null,
  };

  componentWillUnmount() {
    this._isMounted = false;
  }

  componentDidMount() {
    this._isMounted = true;
  }

  _loadRightFields = async (indexPatternId: string) => {
    this.setState({ rightTermsFields: [], rightIndexPatternTitle: null });

    let indexPattern;
    try {
      indexPattern = await getIndexPatternService().get(indexPatternId);
    } catch (err) {
      return;
    }

    // method may be called again before 'get' returns
    // ignore response when fetched index pattern does not match active index pattern
    if (!this._isMounted || indexPatternId !== this.state.rightIndexPatternId) {
      return;
    }

    this.setState({
      rightTermsFields: getTermsFields(indexPattern.fields),
      rightIndexPatternTitle: indexPattern.title,
    });
  };

  _loadEmsFileFields = async () => {
    const emsFileLayers = await getEmsFileLayers();
    const emsFileLayer = emsFileLayers.find((fileLayer: FileLayer) => {
      return fileLayer.getId() === this.state.leftEmsFileId;
    });

    if (!this._isMounted || !emsFileLayer) {
      return;
    }

    const leftEmsFields = emsFileLayer
      .getFieldsInLanguage()
      .filter((field) => {
        return field.type === 'id';
      })
      .map((field) => {
        return {
          value: field.name,
          label: field.description,
        };
      });
    this.setState(
      {
        leftEmsFields,
        leftEmsJoinField: leftEmsFields.length ? leftEmsFields[0].value : null,
      },
      this._previewLayer
    );
  };

  _onLeftSourceChange = (optionId: string) => {
    this.setState(
      { leftSource: optionId as BOUNDARIES_SOURCE, rightJoinField: null },
      this._previewLayer
    );
  };

  _onLeftIndexPatternChange = (indexPattern: DataView) => {
    this.setState(
      {
        leftIndexPattern: indexPattern,
        leftGeoFields: getGeoFields(indexPattern.fields),
        leftJoinFields: getSourceFields(indexPattern.fields),
        leftGeoField: null,
        leftElasticsearchJoinField: null,
        rightJoinField: null,
      },
      () => {
        // make default geo field selection
        if (this.state.leftGeoFields.length) {
          // @ts-expect-error - avoid wrong "Property 'name' does not exist on type 'never'." compile error
          this._onLeftGeoFieldSelect(this.state.leftGeoFields[0].name);
        }
      }
    );
  };

  _onLeftGeoFieldSelect = (geoField?: string) => {
    if (!geoField) {
      return;
    }
    this.setState({ leftGeoField: geoField }, this._previewLayer);
  };

  _onLeftJoinFieldSelect = (joinField?: string) => {
    if (!joinField) {
      return;
    }
    this.setState({ leftElasticsearchJoinField: joinField }, this._previewLayer);
  };

  _onLeftEmsFileChange = (emFileId: string) => {
    this.setState({ leftEmsFileId: emFileId, leftEmsJoinField: null, rightJoinField: null }, () => {
      this._previewLayer();
      this._loadEmsFileFields();
    });
  };

  _onLeftEmsFieldChange = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    if (selectedOptions.length === 0) {
      return;
    }

    this.setState({ leftEmsJoinField: selectedOptions[0].value! }, this._previewLayer);
  };

  _onRightIndexPatternChange = (indexPatternId?: string) => {
    if (!indexPatternId) {
      return;
    }

    this.setState(
      {
        rightIndexPatternId: indexPatternId,
        rightJoinField: null,
      },
      () => {
        this._previewLayer();
        this._loadRightFields(indexPatternId);
      }
    );
  };

  _onRightJoinFieldSelect = (joinField?: string) => {
    if (!joinField) {
      return;
    }
    this.setState({ rightJoinField: joinField }, this._previewLayer);
  };

  _isLeftConfigComplete() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      return (
        !!this.state.leftIndexPattern &&
        !!this.state.leftGeoField &&
        !!this.state.leftElasticsearchJoinField
      );
    } else {
      return !!this.state.leftEmsFileId && !!this.state.leftEmsJoinField;
    }
  }

  _isRightConfigComplete() {
    return !!this.state.rightIndexPatternId && !!this.state.rightJoinField;
  }

  _previewLayer() {
    if (!this._isLeftConfigComplete() || !this._isRightConfigComplete()) {
      this.props.previewLayers([]);
      return;
    }

    const layerDescriptor =
      this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH
        ? createEsChoroplethLayerDescriptor({
            // @ts-expect-error - avoid wrong "Property 'id' does not exist on type 'never'." compile error
            leftIndexPatternId: this.state.leftIndexPattern!.id,
            leftGeoField: this.state.leftGeoField!,
            leftJoinField: this.state.leftElasticsearchJoinField!,
            rightIndexPatternId: this.state.rightIndexPatternId,
            rightIndexPatternTitle: this.state.rightIndexPatternTitle!,
            rightTermField: this.state.rightJoinField!,
          })
        : createEmsChoroplethLayerDescriptor({
            leftEmsFileId: this.state.leftEmsFileId!,
            leftEmsField: this.state.leftEmsJoinField!,
            rightIndexPatternId: this.state.rightIndexPatternId,
            rightIndexPatternTitle: this.state.rightIndexPatternTitle!,
            rightTermField: this.state.rightJoinField!,
          });

    this.props.previewLayers([layerDescriptor]);
  }

  _renderLeftSourceForm() {
    if (this.state.leftSource === BOUNDARIES_SOURCE.ELASTICSEARCH) {
      let geoFieldSelect;
      if (this.state.leftGeoFields.length) {
        geoFieldSelect = (
          <EuiFormRow
            label={i18n.translate('xpack.maps.choropleth.geofieldLabel', {
              defaultMessage: 'Geospatial field',
            })}
          >
            <SingleFieldSelect
              placeholder={i18n.translate('xpack.maps.choropleth.geofieldPlaceholder', {
                defaultMessage: 'Select geo field',
              })}
              value={this.state.leftGeoField}
              onChange={this._onLeftGeoFieldSelect}
              fields={this.state.leftGeoFields}
              isClearable={false}
            />
          </EuiFormRow>
        );
      }
      let joinFieldSelect;
      if (this.state.leftJoinFields.length) {
        joinFieldSelect = (
          <EuiFormRow
            label={i18n.translate('xpack.maps.choropleth.joinFieldLabel', {
              defaultMessage: 'Join field',
            })}
          >
            <SingleFieldSelect
              placeholder={i18n.translate('xpack.maps.choropleth.joinFieldPlaceholder', {
                defaultMessage: 'Select field',
              })}
              value={this.state.leftElasticsearchJoinField}
              onChange={this._onLeftJoinFieldSelect}
              fields={this.state.leftJoinFields}
              isClearable={false}
            />
          </EuiFormRow>
        );
      }
      return (
        <>
          <GeoIndexPatternSelect
            // @ts-expect-error - avoid wrong "Property 'id' does not exist on type 'never'." compile error
            value={this.state.leftIndexPattern ? this.state.leftIndexPattern!.id : ''}
            onChange={this._onLeftIndexPatternChange}
          />
          {geoFieldSelect}
          {joinFieldSelect}
        </>
      );
    } else {
      let emsFieldSelect;
      if (this.state.leftEmsFields.length) {
        let selectedOption;
        if (this.state.leftEmsJoinField) {
          selectedOption = this.state.leftEmsFields.find(
            (option: EuiComboBoxOptionOption<string>) => {
              return this.state.leftEmsJoinField === option.value;
            }
          );
        }
        emsFieldSelect = (
          <EuiFormRow
            label={i18n.translate('xpack.maps.choropleth.joinFieldLabel', {
              defaultMessage: 'Join field',
            })}
          >
            <EuiComboBox
              singleSelection={true}
              isClearable={false}
              options={this.state.leftEmsFields}
              selectedOptions={selectedOption ? [selectedOption] : []}
              onChange={this._onLeftEmsFieldChange}
            />
          </EuiFormRow>
        );
      }
      return (
        <>
          <EMSFileSelect value={this.state.leftEmsFileId} onChange={this._onLeftEmsFileChange} />
          {emsFieldSelect}
        </>
      );
    }
  }

  _renderLeftPanel() {
    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.choropleth.boundariesLabel"
              defaultMessage="Boundaries source"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow>
          <EuiRadioGroup
            options={BOUNDARIES_OPTIONS}
            idSelected={this.state.leftSource}
            onChange={this._onLeftSourceChange}
          />
        </EuiFormRow>

        {this._renderLeftSourceForm()}
      </EuiPanel>
    );
  }

  _renderRightPanel() {
    if (!this._isLeftConfigComplete()) {
      return null;
    }
    const IndexPatternSelect = getIndexPatternSelectComponent();

    let joinFieldSelect;
    if (this.state.rightTermsFields.length) {
      joinFieldSelect = (
        <EuiFormRow
          label={i18n.translate('xpack.maps.choropleth.joinFieldLabel', {
            defaultMessage: 'Join field',
          })}
        >
          <SingleFieldSelect
            placeholder={i18n.translate('xpack.maps.choropleth.joinFieldPlaceholder', {
              defaultMessage: 'Select field',
            })}
            value={this.state.rightJoinField}
            onChange={this._onRightJoinFieldSelect}
            fields={this.state.rightTermsFields}
            isClearable={false}
          />
        </EuiFormRow>
      );
    }

    return (
      <EuiPanel>
        <EuiTitle size="xs">
          <h5>
            <FormattedMessage
              id="xpack.maps.choropleth.statisticsLabel"
              defaultMessage="Statistics source"
            />
          </h5>
        </EuiTitle>

        <EuiSpacer size="m" />

        <EuiFormRow label={getDataViewLabel()}>
          <IndexPatternSelect
            placeholder={getDataViewSelectPlaceholder()}
            indexPatternId={this.state.rightIndexPatternId}
            onChange={this._onRightIndexPatternChange}
            isClearable={false}
          />
        </EuiFormRow>

        {joinFieldSelect}
      </EuiPanel>
    );
  }

  render() {
    return (
      <>
        {this._renderLeftPanel()}

        <EuiSpacer size="s" />

        {this._renderRightPanel()}
      </>
    );
  }
}
