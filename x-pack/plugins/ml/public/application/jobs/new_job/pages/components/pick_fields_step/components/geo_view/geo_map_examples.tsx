/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useEffect, useState } from 'react'; // useCallback, useMemo,
import { EuiFlexGrid, EuiFlexItem } from '@elastic/eui';
import { ES_GEO_FIELD_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import { SplitCards, useAnimateSplit } from '../split_cards';
import { MlEmbeddedMapComponent } from '../../../../../../../components/ml_embedded_map';
import { useMlKibana } from '../../../../../../../contexts/kibana';
import { Field, SplitField } from '../../../../../../../../../common/types/fields';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';

interface Props {
  dataViewId?: string;
  geoField: Field;
  splitField: SplitField;
  fieldValues: string[];
}

export const GeoMapExamples: FC<Props> = ({ dataViewId, geoField, splitField, fieldValues }) => {
  const [layerList, setLayerList] = useState<LayerDescriptor[]>([]);

  const {
    services: { maps: mapsPlugin, data },
  } = useMlKibana();
  const animateSplit = useAnimateSplit();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataViewId, geoField, splitField, fieldValues]);

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
            {/* <DetectorTitle
                index={i}
                agg={aggFieldPairList[i].agg}
                field={aggFieldPairList[i].field}
                deleteDetector={deleteDetector}
              /> */}
            <span data-test-subj="mlGeoJobWizardMap" style={{ width: '100%', height: 300 }}>
              <MlEmbeddedMapComponent layerList={layerList} />
            </span>
          </>
        </EuiFlexItem>
      </EuiFlexGrid>
    </SplitCards>
  );
};
