/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import type { Embeddable } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { i18n } from '@kbn/i18n';
import // MapEmbeddable,
// MapEmbeddableInput,
// MapEmbeddableOutput,
'@kbn/maps-plugin/public';
import { FormattedMessage } from '@kbn/i18n-react';
import {
  EuiAccordion,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiButtonEmpty,
  EuiFlyoutBody,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';

import { JobDetails } from './job_details';

// import { useMlFromLensKibanaContext } from '../context';

interface DropDownLabel {
  label: string;
  field: string;
}

interface Props {
  embeddable: Embeddable;
  onClose: () => void;
}

// TODO: Cannot find a date field for when there's no date field
export const GeoJobFlyout: FC<Props> = ({ onClose, embeddable }) => {
  const { euiTheme } = useEuiTheme();
  // const {
  //   services: { data, lens },
  // } = useMlFromLensKibanaContext();

  const [geoFields, setGeoFields] = useState<Record<string, DataView>>({});
  const [selectedGeoField, setSelectedGeoField] = useState<string | null>(null);
  const [selectedSplitField, setSelectedSplitField] = useState<string | null>(null);

  useEffect(() => {
    if (embeddable !== undefined) {
      // @ts-ignore
      const dataViews = embeddable.getRoot().allDataViews;
      // @ts-ignore // TODO: remove
      const layers = embeddable._savedMap?._attributes
        ? // @ts-ignore // TODO: remove
          JSON.parse(embeddable._savedMap._attributes.layerListJSON)
        : [];
      // Create a map matching up geoField to the DataView it's from
      const geoFieldMap = layers.reduce((acc: any, layer: any) => {
        const { sourceDescriptor } = layer;
        const { geoField, indexPatternId } = sourceDescriptor;
        const dataViewForGeoField = dataViews.find(
          (dataView: DataView) => dataView.id === indexPatternId
        );
        return {
          ...acc,
          ...(geoField !== undefined && dataViewForGeoField !== undefined
            ? { [geoField]: dataViewForGeoField }
            : {}),
        };
      }, {});

      if (Object.keys(geoFieldMap).length === 1) {
        // If only one geoField go ahead and set it
        setSelectedGeoField(Object.keys(geoFieldMap)[0]);
      }
      setGeoFields(geoFieldMap);
    }
  }, [embeddable]);

  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      Object.keys(geoFields).map((geoField) => ({
        label: geoField,
        field: geoField,
      })),
    [geoFields]
  );

  const onChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    const option = selectedOptions[0] as DropDownLabel;
    if (typeof option !== 'undefined') {
      setSelectedGeoField(option.field);
    } else {
      setSelectedGeoField(null);
    }
  }, []);

  const onSplitFieldChange = useCallback((selectedOptions: EuiComboBoxOptionOption[]) => {
    const option = selectedOptions[0] as DropDownLabel;
    if (typeof option !== 'undefined') {
      setSelectedSplitField(option.field);
    } else {
      setSelectedSplitField(null);
    }
  }, []);

  const selection: EuiComboBoxOptionOption[] = useMemo(() => {
    const selectedOptions: EuiComboBoxOptionOption[] = [];
    if (selectedGeoField) {
      selectedOptions.push({ label: selectedGeoField, field: selectedGeoField } as DropDownLabel);
    }
    return selectedOptions;
  }, [selectedGeoField]);

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

  const splitFieldOptionsForSelectedGeoField: EuiComboBoxOptionOption[] = useMemo(() => {
    if (selectedGeoField) {
      return geoFields[selectedGeoField].fields.map((field) => ({
        label: field.displayName,
        field: field.name,
      }));
    } else {
      return [];
    }
  }, [selectedGeoField, geoFields]);

  return (
    <>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h3>
            <FormattedMessage
              id="xpack.ml.embeddables.geoJobFlyout.title"
              defaultMessage="Create anomaly detection job"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />
        <EuiText size="s">
          <FormattedMessage
            id="xpack.ml.embeddables.geoJobFlyout.secondTitle"
            defaultMessage="Create an anomaly detection lat_long job from map visualization {title}."
            values={{ title: embeddable.getTitle() }}
          />
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={{ backgroundColor: euiTheme.colors.lightestShade }}>
        <EuiPanel paddingSize="m">
          <EuiFormRow
            label={
              <FormattedMessage
                id="xpack.ml.embeddables.geoJobFlyout.selectGeoField"
                defaultMessage="Geo field"
              />
            }
          >
            <EuiComboBox
              singleSelection={{ asPlainText: true }}
              options={options}
              selectedOptions={selection}
              onChange={onChange}
              isClearable={true}
              data-test-subj="mlGeoFieldNameSelect"
            />
          </EuiFormRow>
          {/* TODO: only show a subset - maybe by keyword type only like in the advanced wizard */}
          {selectedGeoField && splitFieldOptionsForSelectedGeoField.length ? (
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
          <EuiSpacer />
          {selectedGeoField ? <JobDetails embeddable={embeddable} /> : null}
        </EuiPanel>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={onClose} flush="left">
              <FormattedMessage
                id="xpack.ml.embeddables.geoJobFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </>
  );
};
