/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, useMemo } from 'react';
import { AnnotationUpdatesService } from '../../../services/annotations_service';

interface MlAnnotationWrapperProps {
  children: (annotationUpdatesService: AnnotationUpdatesService) => React.ReactElement;
}

export const MlAnnotationComponent: FC<MlAnnotationWrapperProps> = ({ children }) => {
  const service = useMemo(() => new AnnotationUpdatesService(), []);
  return <>{children(service)}</>;
};
