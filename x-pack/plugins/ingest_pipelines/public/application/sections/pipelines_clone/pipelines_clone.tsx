/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { EuiPageContent } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import { SectionLoading, useKibana, attemptToURIDecode } from '../../../shared_imports';

import { PipelinesCreate } from '../pipelines_create';

export interface ParamProps {
  sourceName: string;
}

/**
 * This section is a wrapper around the create section where we receive a pipeline name
 * to load and set as the source pipeline for the {@link PipelinesCreate} form.
 */
export const PipelinesClone: FunctionComponent<RouteComponentProps<ParamProps>> = (props) => {
  const { sourceName } = props.match.params;
  const { services } = useKibana();

  const decodedSourceName = attemptToURIDecode(sourceName)!;
  const {
    error,
    data: pipeline,
    isLoading,
    isInitialRequest,
  } = services.api.useLoadPipeline(decodedSourceName);

  useEffect(() => {
    if (error && !isLoading) {
      services.notifications!.toasts.addError(error, {
        title: i18n.translate('xpack.ingestPipelines.clone.loadSourcePipelineErrorTitle', {
          defaultMessage: 'Cannot load {name}.',
          values: { name: sourceName },
        }),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, isLoading]);

  if (isLoading && isInitialRequest) {
    return (
      <EuiPageContent verticalPosition="center" horizontalPosition="center" color="subdued">
        <SectionLoading>
          <FormattedMessage
            id="xpack.ingestPipelines.clone.loadingPipelinesDescription"
            defaultMessage="Loading pipeline…"
          />
        </SectionLoading>
      </EuiPageContent>
    );
  } else {
    // We still show the create form even if we were not able to load the
    // latest pipeline data.
    const sourcePipeline = pipeline ? { ...pipeline, name: `${pipeline.name}-copy` } : undefined;
    return <PipelinesCreate {...props} sourcePipeline={sourcePipeline} />;
  }
};
