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
import type { CreateAnnotationForm } from './components/create_annotation';
import { ObservabilityAnnotations, CreateAnnotation } from './components';
import { useEditAnnotation } from './hooks/use_edit_annotation';
import { useFetchAnnotations } from './use_fetch_annotations';
import type { Annotation } from '../../../common/annotations';

export const useAnnotations = ({
  sloId,
  sloInstanceId,
  editAnnotation,
}: {
  editAnnotation?: Annotation | null;
  sloId?: string;
  sloInstanceId?: string;
} = {}) => {
  const [isCreateAnnotationsOpen, setIsCreateAnnotationsOpen] = useState(false);
  const methods = useForm<CreateAnnotationForm>({
    defaultValues: {
      ...getDefaultAnnotation(),
      slo: {
        id: sloId,
        instanceId: sloInstanceId,
      },
    },
    mode: 'all',
  });
  const { setValue, reset } = methods;
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [selectedEditAnnotation, setSelectedEditAnnotation] = useState<Annotation | null>(null);

  const { data, refetch } = useFetchAnnotations({
    start: 'now-7d',
    end: 'now',
    sloId,
    sloInstanceId,
  });

  useKey(
    (event) => event.metaKey,
    (event) => {
      setIsCtrlPressed(event.type === 'keydown');
    }
  );

  useEditAnnotation({
    reset,
    editAnnotation: editAnnotation ?? selectedEditAnnotation,
    setIsCreateAnnotationsOpen,
  });

  const onCancel = useCallback(() => {
    setValue('@timestamp', null);
    setValue('@timestampEnd', null);
    setIsCreateAnnotationsOpen(false);
  }, [setValue]);

  const AddAnnotationButton = useMemo(() => {
    return () => (
      <CreateAnnotation
        onSave={() => {
          setIsCreateAnnotationsOpen(false);
          refetch();
        }}
        onCancel={onCancel}
        editAnnotation={editAnnotation ?? selectedEditAnnotation}
        isCreateAnnotationsOpen={isCreateAnnotationsOpen}
      />
    );
  }, [editAnnotation, isCreateAnnotationsOpen, onCancel, refetch, selectedEditAnnotation]);

  return {
    annotations: data,
    onAnnotationClick: (annotations: {
      rects: RectAnnotationEvent[];
      lines: LineAnnotationEvent[];
    }) => {
      if (annotations.rects.length) {
        const selectedAnnotation = data?.find((a) => annotations.rects[0].id.includes(a.id));
        if (selectedAnnotation) {
          setSelectedEditAnnotation(selectedAnnotation);
        }
      }
      if (annotations.lines.length) {
        const selectedAnnotation = data?.find((a) => annotations.lines[0].id.includes(a.id));
        if (selectedAnnotation) {
          setSelectedEditAnnotation(selectedAnnotation);
        }
      }
    },
    wrapOnBrushEnd: (originalHandler: (event: BrushEvent) => void) => {
      return (event: BrushEvent) => {
        if (isCtrlPressed) {
          const { to, from } = getBrushData(event);
          setValue('@timestamp', moment(from));
          setValue('@timestampEnd', moment(to));
          setValue('annotation.type', 'range');
          setIsCreateAnnotationsOpen(true);
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
      setIsCreateAnnotationsOpen(true);
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
            setIsCreateAnnotationsOpen={setIsCreateAnnotationsOpen}
          />
          <AddAnnotationButton />
        </FormProvider>
      );
    },
  };
};

const getDefaultAnnotation = (): Partial<CreateAnnotationForm> => {
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
  };
};

function getBrushData(e: BrushEvent) {
  const [from, to] = [Number(e.x?.[0]), Number(e.x?.[1])];
  const [fromUtc, toUtc] = [moment(from).format(), moment(to).format()];

  return { from: fromUtc, to: toUtc };
}
