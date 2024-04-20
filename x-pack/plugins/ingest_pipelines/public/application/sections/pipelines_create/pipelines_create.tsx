/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RouteComponentProps, useHistory } from 'react-router-dom';

import { getListPath } from '../../services/navigation';
import { Pipeline } from '../../../../common/types';
import { useKibana } from '../../../shared_imports';
import { PipelineForm } from '../../components';
import { useRedirectToPathOrRedirectPath } from '../../hooks';

interface Props {
  /**
   * This value may be passed in to prepopulate the creation form
   */
  sourcePipeline?: Pipeline;
}

interface LocationState {
  sourcePipeline?: Pipeline;
}

function useFormDefaultValue(sourcePipeline?: Pipeline) {
  const history = useHistory<LocationState>();

  const locationSearchParams = useMemo(() => {
    return new URLSearchParams(history.location.search);
  }, [history.location.search]);

  const formDefaultValue = useMemo(() => {
    if (sourcePipeline) {
      return sourcePipeline;
    }

    if (history.location.state?.sourcePipeline) {
      return history.location.state.sourcePipeline;
    }

    if (locationSearchParams.has('name')) {
      return {
        name: locationSearchParams.get('name') as string,
        description: '',
        processors: [],
        on_failure: [],
      };
    }
  }, [sourcePipeline, history, locationSearchParams]);

  return { formDefaultValue, canEditName: !locationSearchParams.has('name') };
}

export const PipelinesCreate: React.FunctionComponent<RouteComponentProps & Props> = ({
  sourcePipeline,
}) => {
  const history = useHistory<LocationState>();

  const { services } = useKibana();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const { formDefaultValue, canEditName } = useFormDefaultValue(sourcePipeline);
  const redirectToPathOrRedirectPath = useRedirectToPathOrRedirectPath(history);

  const onSave = async (pipeline: Pipeline) => {
    setIsSaving(true);
    setSaveError(null);

    const { error } = await services.api.createPipeline(pipeline);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    redirectToPathOrRedirectPath(getListPath({ inspectedPipelineName: pipeline.name }));
  };

  useEffect(() => {
    services.breadcrumbs.setBreadcrumbs('create');
  }, [services]);

  return (
    <PipelineForm
      defaultValue={formDefaultValue}
      canEditName={canEditName}
      onSave={onSave}
      isSaving={isSaving}
      saveError={saveError}
    />
  );
};
