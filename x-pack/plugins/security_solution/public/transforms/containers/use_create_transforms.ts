/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useEffect, useState } from 'react';
import { defaultTransformsSetting, DEFAULT_TRANSFORMS } from '../../../common/constants';
import { TransformConfigSchema } from '../../../common/transforms/types';
import { errorToToaster, useStateToaster } from '../../common/components/toasters';
import * as i18n from './translations';
import { createTransforms } from './api';
import { useUiSetting$ } from '../../common/lib/kibana';
import { useIsExperimentalFeatureEnabled } from '../../common/hooks/use_experimental_features';

type Func = () => Promise<void>;

export interface ReturnTransform {
  loading: boolean;
  createTransforms: Func;
}

export const noop: Func = () => Promise.resolve();

export const useCreateTransforms = (): ReturnTransform => {
  const [loading, setLoading] = useState(true);
  const [, dispatchToaster] = useStateToaster();
  const [transformSettings] = useUiSetting$<TransformConfigSchema>(
    DEFAULT_TRANSFORMS,
    JSON.stringify(defaultTransformsSetting) as unknown as TransformConfigSchema // TODO: The types are not 100% correct within uiSettings$, so I have to cast here. Once that is fixed, this cast can be removed
  );
  const [transforms, setTransforms] = useState<Omit<ReturnTransform, 'loading'>>({
    createTransforms: noop,
  });
  // TODO: Once we are past experimental phase this code should be removed
  const metricsEntitiesEnabled = useIsExperimentalFeatureEnabled('metricsEntitiesEnabled');

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();

    const createTheTransforms = async () => {
      // TODO: Once we are past experimental phase this code should be removed
      if (!metricsEntitiesEnabled) {
        return;
      }

      // double check one more time and not create the transform if the settings are not enabled.
      if (!transformSettings.enabled || !transformSettings.auto_create) {
        return;
      }
      let isFetchingData = false;
      setLoading(true);
      const bodies = getTransformBodies(transformSettings);
      try {
        await createTransforms({ bodies, signal: abortCtrl.signal });
        if (isSubscribed) {
          isFetchingData = true;
        }
      } catch (error) {
        if (isSubscribed) {
          if (error.body.statusCode !== 404 && error.body.status_code !== 404) {
            errorToToaster({ title: i18n.TRANSFORM_CREATE_FAILURE, error, dispatchToaster });
          } else {
            // This means that the plugin is disabled and/or the user does not have permissions
            // so we do not show an error toaster for this condition since this is a 404 error message
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
  }, [dispatchToaster, transformSettings, metricsEntitiesEnabled]);

  return { loading, ...transforms };
};

export const getTransformBodies = (transformSettings: TransformConfigSchema) => {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { query, auto_start, max_page_search_size, docs_per_second } = transformSettings;
  return transformSettings.settings.map(({ prefix, indices }) => {
    return {
      query,
      prefix,
      modules: [
        'host_metrics',
        'host_entities',
        'network_entities',
        'network_metrics',
        'user_entities',
        'user_metrics',
      ],
      indices,
      auto_start,
      settings: {
        max_page_search_size,
        docs_per_second,
      },
    };
  });
};
