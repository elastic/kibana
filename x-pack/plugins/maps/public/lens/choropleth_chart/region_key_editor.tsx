/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiComboBox, EuiComboBoxOptionOption, EuiFormRow, EuiSelect } from '@elastic/eui';
import type { FileLayer } from '@elastic/ems-client';
import { ChoroplethChartState } from './types';
import { EMSFileSelect } from '../../components/ems_file_select';
import { getEmsFileLayers } from '../../util';

interface Props {
  state: ChoroplethChartState;
  setState: (state: ChoroplethChartState) => void;
}

export function RegionKeyEditor(props: Props) {
  const [emsFileLayers, setEmsFileLayers] = useState<FileLayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    setIsLoading(true);
    getEmsFileLayers()
      .then((fileLayers) => {
        if (!ignore) {
          setEmsFileLayers(fileLayers);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!ignore) {
          // eslint-disable-next-line no-console
          console.warn(
            `Lens region map is unable to access administrative boundaries from Elastic Maps Service (EMS). To avoid unnecessary EMS requests, set 'map.includeElasticMapsService: false' in 'kibana.yml'.`
          );
          setIsLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, []);

  function onEmsLayerSelect(emsLayerId: string) {
    const emsFields = getEmsFields(emsFileLayers, emsLayerId);
    props.setState({
      ...props.state,
      emsLayerId,
      emsField: emsFields.length ? emsFields[0].value : undefined,
    });
  }

  const emsFieldSelect = useMemo(() => {
    const emsFields = getEmsFields(emsFileLayers, props.state.emsLayerId);
    if (emsFields.length === 0) {
      return null;
    }

    const selectedOption = props.state.emsField
      ? emsFields.find((option: EuiComboBoxOptionOption<string>) => {
          return props.state.emsField === option.value;
        })
      : undefined;

    function onEmsFieldSelect(selectedOptions: Array<EuiComboBoxOptionOption<string>>) {
      if (selectedOptions.length === 0) {
        return;
      }

      props.setState({
        ...props.state,
        emsField: selectedOptions[0].value,
      });
    }

    return (
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
  }, [emsFileLayers, props]);

  return isLoading ? (
    <EuiSelect isLoading />
  ) : (
    <>
      <EMSFileSelect
        isColumnCompressed
        value={props.state.emsLayerId ? props.state.emsLayerId : null}
        onChange={onEmsLayerSelect}
      />
      {emsFieldSelect}
    </>
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
