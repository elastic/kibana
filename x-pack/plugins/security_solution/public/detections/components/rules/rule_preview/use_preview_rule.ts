/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useState } from 'react';

import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type {
  PreviewResponse,
  CreateRulesSchema,
} from '../../../../../common/detection_engine/schemas/request';

import { previewRule } from '../../../../detection_engine/rule_management/api/api';
import * as i18n from '../../../../detection_engine/rule_management/logic/translations';
import { transformOutput } from '../../../containers/detection_engine/rules/transforms';
import type { TimeframePreviewOptions } from '../../../pages/detection_engine/rules/types';
import { usePreviewInvocationCount } from './use_preview_invocation_count';

const emptyPreviewRule: PreviewResponse = {
  previewId: undefined,
  logs: [],
  isAborted: false,
};

export const usePreviewRule = ({
  timeframeOptions,
}: {
  timeframeOptions: TimeframePreviewOptions;
}) => {
  const [rule, setRule] = useState<CreateRulesSchema | null>(null);
  const [response, setResponse] = useState<PreviewResponse>(emptyPreviewRule);
  const [isLoading, setIsLoading] = useState(false);
  const { addError } = useAppToasts();
  const { invocationCount, interval, from } = usePreviewInvocationCount({ timeframeOptions });

  const timeframeEnd = useMemo(
    () => timeframeOptions.timeframeEnd.toISOString(),
    [timeframeOptions]
  );

  useEffect(() => {
    if (!rule) {
      setResponse(emptyPreviewRule);
      setIsLoading(false);
    }
  }, [rule]);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    setResponse(emptyPreviewRule);
    const createPreviewId = async () => {
      if (rule != null) {
        try {
          setIsLoading(true);
          const previewRuleResponse = await previewRule({
            rule: {
              ...transformOutput({
                ...rule,
                interval,
                from,
              }),
              invocationCount,
              timeframeEnd,
            },
            signal: abortCtrl.signal,
          });
          if (isSubscribed) {
            setResponse(previewRuleResponse);
          }
        } catch (error) {
          if (isSubscribed) {
            addError(error, { title: i18n.RULE_ADD_FAILURE });
          }
        }
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    };

    createPreviewId();
    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [rule, addError, invocationCount, from, interval, timeframeEnd]);

  return { isLoading, response, rule, setRule };
};
