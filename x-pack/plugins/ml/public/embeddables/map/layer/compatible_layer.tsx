/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useMemo, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiAccordion,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { MapEmbeddable } from '@kbn/maps-plugin/public';
import { JobDetails } from '../job_details';
import type { LayerResult } from '../../../application/jobs/new_job/job_from_map';

interface DropDownLabel {
  label: string;
  field: string;
}

interface Props {
  embeddable: MapEmbeddable;
  layer: LayerResult;
  layerIndex: number;
}

export const CompatibleLayer: FC<Props> = ({ embeddable, layer, layerIndex }) => {
  const [selectedSplitField, setSelectedSplitField] = useState<string | null>(null);

  const splitFieldSelection: EuiComboBoxOptionOption[] = useMemo(() => {
    const selectedOptions: EuiComboBoxOptionOption[] = [];
    if (selectedSplitField) {
      selectedOptions.push({
        label: selectedSplitField,
        field: selectedSplitField,
      } as DropDownLabel);
    }
    return selectedOptions;
  }, [selectedSplitField]);

  const onSplitFieldChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    const option = selectedOptions[0] as DropDownLabel;
    if (typeof option !== 'undefined') {
      setSelectedSplitField(option.field);
    } else {
      setSelectedSplitField(null);
    }
  }, []);
  return (
    <>
      <EuiPanel paddingSize="m">
        <EuiFlexGroup gutterSize="s" data-test-subj="mlLensLayerCompatible">
          <EuiFlexItem grow={false}>
            <EuiText size="s">
              <EuiIcon type="checkInCircleFilled" color="success" />
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiText size="s">
              <FormattedMessage
                id="xpack.ml.embeddables.geoJobFlyout.createJobCalloutTitle.multiMetric"
                defaultMessage="The {geoField} field can be used to create a geo job for {sourceDataViewTitle}"
                values={{
                  geoField: layer.geoField,
                  sourceDataViewTitle: layer.dataView?.getIndexPattern(),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {layer.splitFieldOptions?.length ? (
          <>
            <EuiSpacer size="m" />
            <EuiAccordion
              data-test-subj={'mlGeoJobAdditionalSettingsButton'}
              id="additional-section"
              buttonContent={i18n.translate(
                'xpack.ml.embeddables.geoJobFlyout.createJobCallout.splitField.title',
                {
                  defaultMessage: 'Optionally select a field to split the data',
                }
              )}
            >
              <EuiFormRow
                label={
                  <FormattedMessage
                    id="xpack.ml.embeddables.geoJobFlyout.selectSplitField"
                    defaultMessage="Split field"
                  />
                }
              >
                <EuiComboBox
                  singleSelection={{ asPlainText: true }}
                  options={layer.splitFieldOptions}
                  selectedOptions={splitFieldSelection}
                  onChange={onSplitFieldChange}
                  isClearable={true}
                  data-test-subj="mlGeoJobSplitFieldSelect"
                />
              </EuiFormRow>
            </EuiAccordion>
          </>
        ) : null}
        {layer.dataView ? (
          <JobDetails
            layerIndex={layerIndex}
            embeddable={embeddable}
            sourceDataView={layer.dataView}
            geoField={layer.geoField}
            splitField={selectedSplitField}
          />
        ) : null}
      </EuiPanel>
    </>
  );
};
