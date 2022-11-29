/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useEffect } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';

import { JobCreatorContext } from '../../../job_creator_context';
import { GeoJobCreator } from '../../../../../common/job_creator';
import { GeoField } from './geo_field';

interface Props {
  setIsValid: (na: boolean) => void;
}

export const GeoDetector: FC<Props> = ({ setIsValid }) => {
  const { jobCreator: jc, jobCreatorUpdated } = useContext(JobCreatorContext);
  const jobCreator = jc as GeoJobCreator;

  useEffect(() => {
    let valid = false;
    if (jobCreator.geoField !== null) {
      valid = true;
    }
    setIsValid(valid);
  }, [jobCreatorUpdated]);

  return (
    <>
      <EuiHorizontalRule />
      <GeoField />
      {/* hereis where we add in the map embeddable once the field is selected */}
    </>
  );
};