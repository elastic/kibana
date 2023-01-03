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
import type { MapEmbeddable, ILayer } from '@kbn/maps-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { JobDetails } from '../job_details';
import { categoryFieldTypes } from '../../../../common/util/fields_utils';

interface DropDownLabel {
  label: string;
  field: string;
}

interface Props {
  embeddable: MapEmbeddable;
  layer: ILayer;
  layerIndex: number;
  sourceDataView: DataView;
}

export const CompatibleLayer: FC<Props> = ({ embeddable, layer, layerIndex, sourceDataView }) => {
  const [selectedSplitField, setSelectedSplitField] = useState<string | null>(null);

  const splitFieldOptionsForSelectedGeoField: EuiComboBoxOptionOption[] = useMemo(() => {
    const sortedFields =
      sourceDataView?.fields.getAll().sort((a, b) => a.name.localeCompare(b.name)) ?? [];

    const categoryFields = sortedFields.filter((f) => {
      return categoryFieldTypes.some((type) => f.esTypes?.includes(type));
    });

    const optionsFromFields = categoryFields.map((field) => {
      return {
        label: field.name,
        field: field.name,
      };
    });

    return optionsFromFields;
  }, [sourceDataView]);

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
                  geoField: layer.getGeoFieldNames()[0],
                  sourceDataViewTitle: sourceDataView?.getIndexPattern(),
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
        {splitFieldOptionsForSelectedGeoField.length ? (
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
                  options={splitFieldOptionsForSelectedGeoField}
                  selectedOptions={splitFieldSelection}
                  onChange={onSplitFieldChange}
                  isClearable={true}
                  data-test-subj="mlGeoJobSplitFieldSelect"
                />
              </EuiFormRow>
            </EuiAccordion>
          </>
        ) : null}
        {sourceDataView ? (
          <JobDetails
            layerIndex={layerIndex}
            embeddable={embeddable}
            sourceDataView={sourceDataView}
            geoField={layer.getGeoFieldNames()[0]}
            splitField={selectedSplitField}
          />
        ) : null}
      </EuiPanel>
    </>
  );
};
