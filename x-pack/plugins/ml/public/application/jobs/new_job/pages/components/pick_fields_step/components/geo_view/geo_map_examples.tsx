/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiFlexGrid, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { LayerDescriptor } from '@kbn/maps-plugin/common';
import { SplitCards, useAnimateSplit } from '../split_cards';
import { MlEmbeddedMapComponent } from '../../../../../../../components/ml_embedded_map';
import { Aggregation, Field, SplitField } from '../../../../../../../../../common/types/fields';
import { JOB_TYPE } from '../../../../../../../../../common/constants/new_job';
import { DetectorTitle } from '../detector_title';

interface Props {
  dataViewId?: string;
  geoField: Field | null;
  splitField: SplitField;
  fieldValues: string[];
  geoAgg: Aggregation | null;
  layerList: LayerDescriptor[];
}

export const GeoMapExamples: FC<Props> = ({
  geoField,
  splitField,
  fieldValues,
  geoAgg,
  layerList,
}) => {
  const animateSplit = useAnimateSplit();

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
            {geoAgg && geoField ? <DetectorTitle index={0} agg={geoAgg} field={geoField} /> : null}
            <EuiSpacer size="s" />
            <span data-test-subj="mlGeoJobWizardMap" style={{ width: '100%', height: 400 }}>
              <MlEmbeddedMapComponent layerList={layerList} />
            </span>
          </>
        </EuiFlexItem>
      </EuiFlexGrid>
    </SplitCards>
  );
};
