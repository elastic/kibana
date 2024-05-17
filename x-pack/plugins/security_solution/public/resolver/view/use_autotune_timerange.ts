import { i18n } from '@kbn/i18n';
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppToasts } from '../../common/hooks/use_app_toasts';
import type { State } from '../../common/store/types';
import * as selectors from '../store/selectors';
import { useFormattedDate } from './panels/use_formatted_date';

export function useAutotuneTimerange({ id }: { id: string }) {
  const { addSuccess } = useAppToasts();
  const { from: detectedFrom, to: detectedTo } = useSelector((state: State) => {
    const detectedBounds = selectors.detectedBounds(state.analyzer[id]);
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
