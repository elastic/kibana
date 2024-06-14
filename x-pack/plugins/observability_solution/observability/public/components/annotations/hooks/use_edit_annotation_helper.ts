/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { useEffect } from 'react';
import { UseFormReset } from 'react-hook-form';
import { Annotation } from '../../../../common/annotations';
import { CreateAnnotationForm } from '../components/create_annotation';

export const useEditAnnotationHelper = ({
  reset,
  editAnnotation,
  setIsCreateOpen,
}: {
  reset: UseFormReset<CreateAnnotationForm>;
  editAnnotation?: Annotation | null;
  setIsCreateOpen: (val: boolean) => void;
}) => {
  useEffect(() => {
    if (!editAnnotation) return;

    reset({
      ...editAnnotation,
      '@timestamp': moment(editAnnotation['@timestamp']),
      '@timestampEnd': editAnnotation['@timestampEnd']
        ? moment(editAnnotation['@timestampEnd'])
        : undefined,
    });
    setIsCreateOpen(true);
  }, [editAnnotation, setIsCreateOpen, reset]);
};
