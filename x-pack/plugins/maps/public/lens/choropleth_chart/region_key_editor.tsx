/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow } from '@elastic/eui';
import type { FileLayer } from '@elastic/ems-client';
import { ChoroplethChartState } from './types';
import { EMSFileSelect } from '../../components/ems_file_select';
import { DimensionEditorSection } from '../../../../lens/public';

interface Props {
  emsFileLayers: FileLayer[];
  state: ChoroplethChartState;
  setState: (state: ChoroplethChartState) => void;
}

export function RegionKeyEditor(props: Props) {
  function onEmsLayerSelect(emsLayerId: string) {
    const emsFields = getEmsFields(props.emsFileLayers, emsLayerId);
    props.setState({
      ...props.state,
      emsLayerId,
      emsField: emsFields.length ? emsFields[0].value : undefined,
    });
  }

  function onEmsFieldSelect(selectedOptions: Array<EuiComboBoxOptionOption<string>>) {
    if (selectedOptions.length === 0) {
      return;
    }

    props.setState({
      ...props.state,
      emsField: selectedOptions[0].value,
    });
  }

  let emsFieldSelect;
  const emsFields = getEmsFields(props.emsFileLayers, props.state.emsLayerId);
  if (emsFields.length) {
    let selectedOption;
    if (props.state.emsField) {
      selectedOption = emsFields.find((option: EuiComboBoxOptionOption<string>) => {
        return props.state.emsField === option.value;
      });
    }
    emsFieldSelect = (
      <EuiFormRow
        label={i18n.translate('xpack.maps.choropleth.joinFieldLabel', {
          defaultMessage: 'Join field',
        })}
        display="columnCompressed"
      >
        <EuiComboBox
          singleSelection={true}
          isClearable={false}
          options={emsFields}
          selectedOptions={selectedOption ? [selectedOption] : []}
          onChange={onEmsFieldSelect}
        />
      </EuiFormRow>
    );
  }
  return (
    <DimensionEditorSection>
      <EMSFileSelect
        isColumnCompressed
        value={props.state.emsLayerId ? props.state.emsLayerId : null}
        onChange={onEmsLayerSelect}
      />
      {emsFieldSelect}
    </DimensionEditorSection>
  );
}

function getEmsFields(emsFileLayers: FileLayer[], emsLayerId?: string) {
  if (!emsLayerId) {
    return [];
  }
  const emsFileLayer = emsFileLayers.find((fileLayer: FileLayer) => {
    return fileLayer.getId() === emsLayerId;
  });

  return emsFileLayer
    ? emsFileLayer
        .getFieldsInLanguage()
        .filter((field) => {
          return field.type === 'id';
        })
        .map((field) => {
          return {
            value: field.name,
            label: field.description,
          };
        })
    : [];
}
