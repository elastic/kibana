/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useMemo, useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { useSelector } from 'react-redux';
import * as selectors from '../store/selectors';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import type { ResolverState } from '../types';

export function useAutotuneTimerange() {
  const { addSuccess } = useAppToasts();
  const { from: detectedFrom, to: detectedTo } = useSelector((state: ResolverState) => {
    const detectedBounds = selectors.detectedBounds(state);
    return {
      from: detectedBounds?.from ? detectedBounds.from : undefined,
      to: detectedBounds?.to ? detectedBounds.to : undefined,
    };
  });

  const successMessage = useMemo(() => {
    return i18n.translate('xpack.securitySolution.resolver.unboundedRequest.toast', {
      defaultMessage: `No process events were found with your selected time range, however they were
      found using a start date of {from} and an end date of {to}. Select a different time range in
       the date picker to use a different range.`,
      values: {
        from: detectedFrom,
        to: detectedTo,
      },
    });
  }, [detectedFrom, detectedTo]);
  useEffect(() => {
    if (detectedFrom || detectedTo) {
      addSuccess(successMessage);
    }
  }, [addSuccess, successMessage, detectedFrom, detectedTo]);
}
