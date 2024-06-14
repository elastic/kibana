/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { BrushEvent, TooltipSpec, LineAnnotationEvent, RectAnnotationEvent } from '@elastic/charts';
import { FormProvider, useForm } from 'react-hook-form';
import moment from 'moment';
import useKey from 'react-use/lib/useKey';
import { clone } from 'lodash';
import { useEditAnnotationHelper } from './hooks/use_edit_annotation_helper';
import type { CreateAnnotationForm } from './components/create_annotation';
import { ObservabilityAnnotations, CreateAnnotation } from './components';
import { useFetchAnnotations } from './hooks/use_fetch_annotations';
import type { Annotation } from '../../../common/annotations';
import { useAnnotationCRUDS } from './hooks/use_annotation_cruds';

export const useAnnotations = ({
  domain,
  sloId,
  sloInstanceId,
  editAnnotation,
}: {
  editAnnotation?: Annotation | null;
  sloId?: string;
  sloInstanceId?: string;
  domain?: {
    min: number | string;
    max: number | string;
  };
} = {}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const methods = useForm<CreateAnnotationForm>({
    defaultValues: getDefaultAnnotation(sloId, sloInstanceId),
    mode: 'all',
  });
  const { setValue, reset } = methods;
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [selectedEditAnnotation, setSelectedEditAnnotation] = useState<Annotation | null>(null);

  const { data, refetch } = useFetchAnnotations({
    start: domain?.min ? String(domain?.min) : 'now-30d',
    end: domain?.min ? String(domain?.max) : 'now',
    sloId,
    sloInstanceId,
  });

  useKey(
    (event) => event.metaKey,
    (event) => {
      setIsCtrlPressed(event.type === 'keydown');
    }
  );

  useEditAnnotationHelper({
    reset,
    editAnnotation,
    setIsCreateOpen,
  });

  const onCancel = useCallback(() => {
    setValue('@timestamp', null);
    setValue('@timestampEnd', null);
    setIsCreateOpen(false);
  }, [setValue]);

  const { createAnnotation, updateAnnotation, deleteAnnotation, isLoading } = useAnnotationCRUDS();
  const AddAnnotationButton = useMemo(() => {
    if (!isCreateOpen) return () => null;

    return () => (
      <CreateAnnotation
        onSave={() => {
          setIsCreateOpen(false);
          refetch();
        }}
        onCancel={onCancel}
        editAnnotation={editAnnotation ?? selectedEditAnnotation}
        isCreateAnnotationsOpen={isCreateOpen}
        createAnnotation={createAnnotation}
        updateAnnotation={updateAnnotation}
        deleteAnnotation={deleteAnnotation}
        isLoading={isLoading}
      />
    );
  }, [
    createAnnotation,
    deleteAnnotation,
    editAnnotation,
    isCreateOpen,
    isLoading,
    onCancel,
    refetch,
    selectedEditAnnotation,
    updateAnnotation,
  ]);

  return {
    annotations: data,
    onAnnotationClick: (annotations: {
      rects: RectAnnotationEvent[];
      lines: LineAnnotationEvent[];
    }) => {
      if (annotations.rects.length) {
        const selectedAnnotation = data?.find((a) => annotations.rects[0].id.includes(a.id));
        if (selectedAnnotation) {
          const editData = clone(selectedAnnotation);
          reset({
            ...editData,
            '@timestamp': moment(editData['@timestamp']),
            '@timestampEnd': moment(editData['@timestampEnd']),
          });
          setIsCreateOpen(true);
          setSelectedEditAnnotation(editData);
        }
      }
      if (annotations.lines.length) {
        const selectedAnnotation = data?.find((a) => annotations.lines[0].id.includes(a.id));
        if (selectedAnnotation) {
          const editData = clone(selectedAnnotation);
          reset({
            ...editData,
            '@timestamp': moment(editData['@timestamp']),
          });
          setSelectedEditAnnotation(editData);
          setIsCreateOpen(true);
        }
      }
    },
    wrapOnBrushEnd: (originalHandler: (event: BrushEvent) => void) => {
      return (event: BrushEvent) => {
        if (isCtrlPressed) {
          reset(getDefaultAnnotation(sloId, sloInstanceId));
          setSelectedEditAnnotation(null);
          const { to, from } = getBrushData(event);
          setValue('@timestamp', moment(from));
          setValue('@timestampEnd', moment(to));
          setValue('annotation.type', 'range');
          setIsCreateOpen(true);
        } else {
          // Call the original handler
          originalHandler?.(event);
        }
      };
    },
    createAnnotation: (start: string, end?: string) => {
      if (isNaN(Number(start))) {
        setValue('@timestamp', moment(start));
      } else {
        setValue('@timestamp', moment(new Date(Number(start))));
      }
      if (end) {
        setValue('@timestampEnd', moment(new Date(Number(end))));
        setValue('annotation.type', 'range');
      }
      setIsCreateOpen(true);
    },
    AddAnnotationButton: () => {
      return (
        <FormProvider {...methods}>
          <AddAnnotationButton />
        </FormProvider>
      );
    },
    ObservabilityAnnotations: ({
      tooltipSpecs,
      annotations,
    }: {
      tooltipSpecs?: Partial<TooltipSpec>;
      annotations?: Annotation[];
    }) => {
      return (
        <FormProvider {...methods}>
          <ObservabilityAnnotations
            tooltipSpecs={tooltipSpecs}
            annotations={annotations}
            sloInstanceId={sloInstanceId}
            sloId={sloId}
            isCreateOpen={isCreateOpen}
            setIsCreateOpen={setIsCreateOpen}
          />
          <AddAnnotationButton />
        </FormProvider>
      );
    },
  };
};

const getDefaultAnnotation = (
  sloId?: string,
  sloInstanceId?: string
): Partial<CreateAnnotationForm> => {
  return {
    message: '',
    '@timestamp': moment(),
    annotation: {
      type: 'line',
      style: {
        icon: 'iInCircle',
        color: '#D6BF57',
        line: {
          width: 2,
          style: 'solid',
          textDecoration: 'name',
        },
        rect: {
          fill: 'inside',
          position: 'bottom',
        },
      },
    },
    ...(sloId &&
      sloInstanceId && {
        slo: {
          id: sloId,
          instanceId: sloInstanceId,
        },
      }),
  };
};

function getBrushData(e: BrushEvent) {
  const [from, to] = [Number(e.x?.[0]), Number(e.x?.[1])];
  const [fromUtc, toUtc] = [moment(from).format(), moment(to).format()];

  return { from: fromUtc, to: toUtc };
}
