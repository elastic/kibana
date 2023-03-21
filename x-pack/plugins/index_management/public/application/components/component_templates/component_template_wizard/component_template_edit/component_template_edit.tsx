/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { toMountPoint } from '@kbn/kibana-react-plugin/public';
import {
  EuiPageContentBody_Deprecated as EuiPageContentBody,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import { History } from 'history';

import { useComponentTemplatesContext } from '../../component_templates_context';
import {
  ComponentTemplateDeserialized,
  PageLoading,
  PageError,
  attemptToURIDecode,
  Error,
} from '../../shared_imports';
import { ComponentTemplateForm } from '../component_template_form';
import type { WizardSection } from '../component_template_form';
import { useRedirectPath } from '../../../../hooks/redirect_path';
import { MANAGED_BY_FLEET } from '../../constants';

import { MappingsDatastreamRolloverModal } from './mappings_datastreams_rollover_modal';

interface MatchParams {
  name: string;
}

export function useStepFromQueryString(history: History) {
  const activeStep = useMemo(() => {
    const params = new URLSearchParams(history.location.search);
    if (params.has('step')) {
      return params.get('step') as WizardSection;
    }
  }, [history.location.search]);

  const updateStep = useCallback(
    (stepId: string) => {
      const params = new URLSearchParams(history.location.search);
      if (params.has('step')) {
        params.set('step', stepId);
        history.push({
          search: params.toString(),
        });
      }
    },
    [history]
  );

  return { activeStep, updateStep };
}

export const ComponentTemplateEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const { api, breadcrumbs, overlays } = useComponentTemplatesContext();
  const { activeStep: defaultActiveStep, updateStep } = useStepFromQueryString(history);
  const redirectTo = useRedirectPath(history);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const decodedName = attemptToURIDecode(name)!;

  const { error, data: componentTemplate, isLoading } = api.useLoadComponentTemplate(decodedName);
  const { data: dataStreamResponse } = api.useLoadComponentTemplatesDatastream(decodedName);
  const dataStreams = useMemo(() => dataStreamResponse?.data_streams ?? [], [dataStreamResponse]);

  useEffect(() => {
    breadcrumbs.setEditBreadcrumbs();
  }, [breadcrumbs]);

  const onSave = async (updatedComponentTemplate: ComponentTemplateDeserialized) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: saveErrorObject } = await api.updateComponentTemplate(updatedComponentTemplate);

    setIsSaving(false);

    if (saveErrorObject) {
      setSaveError(saveErrorObject);
      return;
    }

    if (updatedComponentTemplate._meta?.managed_by === MANAGED_BY_FLEET && dataStreams.length) {
      const dataStreamsToRollover: string[] = [];
      for (const dataStream of dataStreams) {
        try {
          const { error: applyMappingError } = await api.postDataStreamMappingsFromTemplate(
            dataStream
          );
          if (applyMappingError) {
            throw applyMappingError;
          }
        } catch (err) {
          dataStreamsToRollover.push(dataStream);
        }
      }

      if (dataStreamsToRollover.length) {
        const ref = overlays.openModal(
          toMountPoint(
            <MappingsDatastreamRolloverModal
              componentTemplatename={updatedComponentTemplate.name}
              dataStreams={dataStreamsToRollover}
              api={api}
              onClose={() => {
                ref.close();
              }}
            />
          )
        );

        await ref.onClose;
      }
    }
    redirectTo({
      pathname: encodeURI(
        `/component_templates/${encodeURIComponent(updatedComponentTemplate.name)}`
      ),
    });
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  if (isLoading) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateEdit.loadingDescription"
          defaultMessage="Loading component template…"
        />
      </PageLoading>
    );
  }

  if (error) {
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.componentTemplateEdit.loadComponentTemplateError"
            defaultMessage="Error loading component template"
          />
        }
        error={error as Error}
        data-test-subj="loadComponentTemplateError"
      />
    );
  }

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateEdit.editPageTitle"
              defaultMessage="Edit component template '{name}'"
              values={{ name: decodedName }}
            />
          </span>
        }
        bottomBorder
      />

      <EuiSpacer size="l" />

      <ComponentTemplateForm
        defaultValue={componentTemplate!}
        dataStreams={dataStreams}
        defaultActiveWizardSection={defaultActiveStep}
        onStepChange={updateStep}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
        isEditing={true}
      />
    </EuiPageContentBody>
  );
};
