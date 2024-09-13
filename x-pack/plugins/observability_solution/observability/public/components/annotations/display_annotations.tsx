/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { Annotation } from '../../../common/annotations';
import { ObsAnnotation } from './components/obs_annotation';

export const DisplayAnnotation = memo(({ annotations }: { annotations?: Annotation[] }) => {
  return (
    <>
      {annotations?.map((annotation, index) => (
        <ObsAnnotation annotation={annotation} key={annotation.id ?? index} />
      ))}
    </>
  );
});
