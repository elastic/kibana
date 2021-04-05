/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { DEFAULT_TRANSFORMS } from '../../../common/constants';
import { TransformConfigSchema } from '../../../common/transforms/types';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import { isSecurityAppError } from '../../common/utils/api';
import * as i18n from './translations';
import { createTransforms } from './api';
import { useUiSetting$ } from '../../common/lib/kibana';

type Func = () => Promise<void>;

export interface ReturnTransform {
  loading: boolean;
  createTransforms: Func;
}

export const noop: Func = () => Promise.resolve();

export const useCreateTransforms = (): ReturnTransform => {
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const [transformSettings] = useUiSetting$<TransformConfigSchema>(DEFAULT_TRANSFORMS);
  const [transforms, setTransforms] = useState<Omit<ReturnTransform, 'loading'>>({
    createTransforms: noop,
  });

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const createTheTransforms = async () => {
      let isFetchingData = false;
      try {
        setLoading(true);
        await createTransforms({ signal: abortCtrl.signal });

        if (isSubscribed) {
          isFetchingData = true;
        }
      } catch (error) {
        if (isSubscribed) {
          if (isSecurityAppError(error)) {
            errorToToaster({ title: i18n.TRANSFORM_CREATE_FAILURE, error, dispatchToaster });
          }
        }
      }
      if (isSubscribed && !isFetchingData) {
        setLoading(false);
      }
    };
    if (transformSettings.enabled) {
      setTransforms({ createTransforms: createTheTransforms });
    } else {
      setTransforms({ createTransforms: noop });
    }
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [dispatchToaster, transformSettings]);

  return { loading, ...transforms };
};
