/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, FunctionComponent } from 'react';
import { i18n } from '@kbn/i18n';

import { Pipeline } from '../../../../../common/types';
import { useFormContext, ViewApiRequestFlyout, useKibana } from '../../../../shared_imports';

import { ReadProcessorsFunction } from '../types';

interface Props {
  closeFlyout: () => void;
  readProcessors: ReadProcessorsFunction;
}

export const PipelineRequestFlyout: FunctionComponent<Props> = ({
  closeFlyout,
  readProcessors,
}) => {
  const { services } = useKibana();
  const form = useFormContext();
  const [formData, setFormData] = useState<Pipeline>({} as Pipeline);
  const pipeline = { ...formData, ...readProcessors() };

  useEffect(() => {
    const subscription = form.subscribe(async ({ isValid, validate, data }) => {
      const isFormValid = isValid ?? (await validate());
      if (isFormValid) {
        setFormData(data.format() as Pipeline);
      }
    });

    return subscription.unsubscribe;
  }, [form]);

  const { name, ...pipelineBody } = pipeline;
  const endpoint = `PUT _ingest/pipeline/${name || '<pipelineName>'}`;
  const request = `${endpoint}\n${JSON.stringify(pipelineBody, null, 2)}`;

  const title = name
    ? i18n.translate('xpack.ingestPipelines.requestFlyout.namedTitle', {
        defaultMessage: "Request for '{name}'",
        values: { name },
      })
    : i18n.translate('xpack.ingestPipelines.requestFlyout.unnamedTitle', {
        defaultMessage: 'Request',
      });

  return (
    <ViewApiRequestFlyout
      title={title}
      description={i18n.translate('xpack.ingestPipelines.requestFlyout.descriptionText', {
        defaultMessage: 'This Elasticsearch request will create or update the pipeline.',
      })}
      request={request}
      closeFlyout={closeFlyout}
      flyoutProps={{ maxWidth: 550 }}
      application={services.application}
      urlService={services.share.url}
    />
  );
};
