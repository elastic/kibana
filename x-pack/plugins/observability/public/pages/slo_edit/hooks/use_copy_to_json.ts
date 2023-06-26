/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UseFormGetValues, UseFormTrigger } from 'react-hook-form';
import { useKibana } from '../../../utils/kibana_react';
import { transformCreateSLOFormToCreateSLOInput } from '../helpers/process_slo_form_values';
import { CreateSLOForm } from '../types';

interface Props {
  trigger: UseFormTrigger<CreateSLOForm>;
  getValues: UseFormGetValues<CreateSLOForm>;
}

export function useCopyToJson({ trigger, getValues }: Props): () => Promise<void> {
  const { notifications } = useKibana().services;

  const handleCopyToJson = async () => {
    const isValid = await trigger();
    if (!isValid) {
      return;
    }
    const values = transformCreateSLOFormToCreateSLOInput(getValues());
    try {
      await copyTextToClipboard(JSON.stringify(values, null, 2));
      notifications.toasts.add({
        title: i18n.translate('xpack.observability.slo.sloEdit.copyJsonNotification', {
          defaultMessage: 'JSON copied to clipboard',
        }),
      });
    } catch (e) {
      notifications.toasts.add({
        title: i18n.translate('xpack.observability.slo.sloEdit.copyJsonFailedNotification', {
          defaultMessage: 'Could not copy JSON to clipboard',
        }),
      });
    }
  };

  const copyTextToClipboard = async (text: string) => {
    if (!window.navigator?.clipboard) {
      throw new Error('Could not copy to clipboard!');
    }
    await window.navigator.clipboard.writeText(text);
  };

  return handleCopyToJson;
}
