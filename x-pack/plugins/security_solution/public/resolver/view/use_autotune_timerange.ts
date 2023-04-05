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
import { useFormattedDate } from './panels/use_formatted_date';
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
  const detectedFormattedFrom = useFormattedDate(detectedFrom);
  const detectedFormattedTo = useFormattedDate(detectedTo);

  const successMessage = useMemo(() => {
    return i18n.translate('xpack.securitySolution.resolver.unboundedRequest.toast', {
      defaultMessage: `No results found in the selected time, expanded to {from} - {to}.`,
      values: {
        from: detectedFormattedFrom,
        to: detectedFormattedTo,
      },
    });
  }, [detectedFormattedFrom, detectedFormattedTo]);
  useEffect(() => {
    if (detectedFrom || detectedTo) {
      addSuccess(successMessage);
    }
  }, [addSuccess, successMessage, detectedFrom, detectedTo]);
}
