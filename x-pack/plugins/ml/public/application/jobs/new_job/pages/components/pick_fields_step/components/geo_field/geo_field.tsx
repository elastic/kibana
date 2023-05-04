/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect, useState } from 'react';

import { GeoFieldSelect } from './geo_field_select';
import { JobCreatorContext } from '../../../job_creator_context';
import { newJobCapsService } from '../../../../../../../services/new_job_capabilities/new_job_capabilities_service';
import { GeoJobCreator } from '../../../../../common/job_creator';
import { Description } from './description';

export const GeoField: FC = () => {
  const { jobCreator: jc, jobCreatorUpdate, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as GeoJobCreator;
  const { geoFields } = newJobCapsService;
  const [geoField, setGeoField] = useState(jobCreator.geoField);

  useEffect(() => {
    jobCreator.setGeoField(geoField);
    jobCreatorUpdate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoField]);

  useEffect(() => {
    if (jobCreator.geoField) {
      setGeoField(jobCreator.geoField);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobCreatorUpdated]);

  return (
    <Description>
      <GeoFieldSelect fields={geoFields} changeHandler={setGeoField} selectedField={geoField} />
    </Description>
  );
};
