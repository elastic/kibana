/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef, useMemo, useCallback } from 'react';

// We wrap this component for edit policy so we do not export it from the "shared_imports" dir to avoid
// accidentally using the non-enhanced version.
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

import { Phases } from '../../../../../../common/types';

import { UseFieldProps, FormData } from '../../../../../shared_imports';

import { useFormErrorsContext } from '../form_errors_context';

const isXPhaseField =
  (phase: keyof Phases) =>
  (fieldPath: string): boolean =>
    fieldPath.startsWith(`phases.${phase}`) || fieldPath.startsWith(`_meta.${phase}`);

const isHotPhaseField = isXPhaseField('hot');
const isWarmPhaseField = isXPhaseField('warm');
const isColdPhaseField = isXPhaseField('cold');
const isFrozenPhaseField = isXPhaseField('frozen');
const isDeletePhaseField = isXPhaseField('delete');

const determineFieldPhase = (fieldPath: string): keyof Phases | 'other' => {
  if (isHotPhaseField(fieldPath)) {
    return 'hot';
  }
  if (isWarmPhaseField(fieldPath)) {
    return 'warm';
  }
  if (isColdPhaseField(fieldPath)) {
    return 'cold';
  }
  if (isFrozenPhaseField(fieldPath)) {
    return 'frozen';
  }
  if (isDeletePhaseField(fieldPath)) {
    return 'delete';
  }
  return 'other';
};

export const EnhancedUseField = <T, F = FormData, I = T>(
  props: UseFieldProps<T, F, I>
): React.ReactElement<any, any> | null => {
  const { path } = props;
  const isMounted = useRef<boolean>(false);
  const phase = useMemo(() => determineFieldPhase(path), [path]);
  const { addError, clearError } = useFormErrorsContext();

  const onError = useCallback(
    (errors: string[] | null) => {
      if (!isMounted.current) {
        return;
      }
      if (errors) {
        addError(phase, path, errors);
      } else {
        clearError(phase, path);
      }
    },
    [phase, path, addError, clearError]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Make sure to clear error message if the field is unmounted.
  useEffect(() => {
    return () => {
      if (isMounted.current === false) {
        clearError(phase, path);
      }
    };
  }, [phase, path, clearError]);

  return <UseField {...props} onError={onError} />;
};
