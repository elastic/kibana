/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ES_GEO_FIELD_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import { GeoJobCreator } from '../../../../../common/job_creator';
import { JobCreatorContext } from '../../../job_creator_context';
import { SplitCards, useAnimateSplit } from '../split_cards';
import { MlEmbeddedMapComponent } from '../../../../../../../components/ml_embedded_map';
import { useMlKibana } from '../../../../../../../contexts/kibana';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
import { DetectorTitle } from '../detector_title';

export const GeoDetectorsSummary: FC = () => {
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);
  const [fieldValues, setFieldValues] = useState<string[]>([]);

  const { jobCreator: jc, chartLoader } = useContext(JobCreatorContext);
  const jobCreator = jc as GeoJobCreator;
  const geoField = jobCreator.geoField;
  const splitField = jobCreator.splitField;
  const dataViewId = jobCreator.indexPatternId;

  const {
    services: { maps: mapsPlugin, data, notifications },
  } = useMlKibana();
  const animateSplit = useAnimateSplit();

  // Load example field values when split field changes
  // changes to fieldValues here will trigger the card effect
  useEffect(() => {
    if (jobCreator.splitField !== null) {
      chartLoader
        .loadFieldExampleValues(
          jobCreator.splitField,
          jobCreator.runtimeMappings,
          jobCreator.datafeedConfig.indices_options
        )
        .then(setFieldValues)
        .catch((error) => {
          // @ts-ignore
          notifications.toasts.addDanger({
            title: i18n.translate('xpack.ml.newJob.geoWizard.fieldValuesFetchErrorTitle', {
              defaultMessage: 'Error fetching field example values: {error}',
              values: { error },
            }),
          });
        });
    } else {
      setFieldValues([]);
    }
  }, []);

  // Update the layer list  with updated geo points upon refresh
  useEffect(() => {
    async function getMapLayersForGeoJob() {
      if (dataViewId !== undefined && geoField) {
        const params: any = {
          indexPatternId: dataViewId,
          geoFieldName: geoField.name,
          geoFieldType: geoField.type as unknown as ES_GEO_FIELD_TYPE,
          filters: data.query.filterManager.getFilters() ?? [],
          ...(fieldValues.length && splitField
            ? { query: { query: `${splitField.name}:${fieldValues[0]}`, language: 'kuery' } }
            : {}),
        };

        const searchLayerDescriptor = mapsPlugin
          ? await mapsPlugin.createLayerDescriptors.createESSearchSourceLayerDescriptor(params)
          : null;

        if (searchLayerDescriptor) {
          setLayerList([searchLayerDescriptor]);
        }
      }
    }
    getMapLayersForGeoJob();
  }, [fieldValues]);

  return (
    <SplitCards
      fieldValues={fieldValues}
      splitField={splitField}
      numberOfDetectors={fieldValues.length}
      jobType={JOB_TYPE.GEO}
      animate={animateSplit}
    >
      <EuiFlexGrid columns={1}>
        <EuiFlexItem data-test-subj={'mlGeoMap'} grow={false}>
          <>
            {jobCreator.geoAgg && geoField ? (
              <DetectorTitle index={0} agg={jobCreator.geoAgg} field={geoField} />
            ) : null}
            <span data-test-subj="mlGeoJobWizardMap" style={{ width: '100%', height: 300 }}>
              <MlEmbeddedMapComponent layerList={layerList} />
            </span>
          </>
        </EuiFlexItem>
      </EuiFlexGrid>
    </SplitCards>
  );
};
