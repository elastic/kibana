/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageSection, EuiPageHeader, EuiSpacer, EuiCallOut } from '@elastic/eui';

import { breadcrumbService, IndexManagementBreadcrumb } from '../../../../services/breadcrumbs';
import { useComponentTemplatesContext } from '../../component_templates_context';
import {
  ComponentTemplateDeserialized,
  PageLoading,
  PageError,
  attemptToURIDecode,
  Error,
} from '../../shared_imports';
import { ComponentTemplateForm } from '../component_template_form';
import { useRedirectPath } from '../../../../hooks/redirect_path';
import { MANAGED_BY_FLEET } from '../../constants';

import { useStepFromQueryString } from '../use_step_from_query_string';
import { useDatastreamsRollover } from '../component_template_datastreams_rollover/use_datastreams_rollover';

interface MatchParams {
  name: string;
}

export const ComponentTemplateEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const { api } = useComponentTemplatesContext();
  const { activeStep: defaultActiveStep, updateStep } = useStepFromQueryString(history);
  const redirectTo = useRedirectPath(history);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const decodedName = attemptToURIDecode(name)!;

  const { error, data: componentTemplate, isLoading } = api.useLoadComponentTemplate(decodedName);
  const { data: dataStreamResponse } = api.useLoadComponentTemplatesDatastream(decodedName);
  const dataStreams = useMemo(() => dataStreamResponse?.data_streams ?? [], [dataStreamResponse]);

  const { showDatastreamRolloverModal } = useDatastreamsRollover();

  useEffect(() => {
    breadcrumbService.setBreadcrumbs(IndexManagementBreadcrumb.componentTemplateEdit);
  }, []);

  const onSave = async (updatedComponentTemplate: ComponentTemplateDeserialized) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: saveErrorObject } = await api.updateComponentTemplate(updatedComponentTemplate);

    setIsSaving(false);

    if (saveErrorObject) {
      setSaveError(saveErrorObject);
      return;
    }

    if (updatedComponentTemplate._meta?.managed_by === MANAGED_BY_FLEET) {
      await showDatastreamRolloverModal(updatedComponentTemplate.name);
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
    <EuiPageSection restrictWidth style={{ width: '100%' }}>
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

      {componentTemplate?.deprecated && (
        <>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.componentTemplateEdit.deprecatedTemplateWarningTitle"
                defaultMessage="This component template is deprecated"
              />
            }
            iconType="warning"
            color="warning"
            data-test-subj="deprecatedTemplateCallout"
          >
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateEdit.deprecatedTemplateWarningDescription"
              defaultMessage="This component template is no longer supported and might be removed in a future release. Instead, use one of the other component templates available or create a new one."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </>
      )}

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
    </EuiPageSection>
  );
};
