/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContentBody, EuiPageHeader, EuiSpacer } from '@elastic/eui';

import { useComponentTemplatesContext } from '../../component_templates_context';
import {
  ComponentTemplateDeserialized,
  PageLoading,
  PageError,
  attemptToURIDecode,
  Error,
} from '../../shared_imports';
import { ComponentTemplateForm } from '../component_template_form';

interface MatchParams {
  name: string;
}

export const ComponentTemplateEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  history,
}) => {
  const { api, breadcrumbs } = useComponentTemplatesContext();

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const decodedName = attemptToURIDecode(name)!;

  const { error, data: componentTemplate, isLoading } = api.useLoadComponentTemplate(decodedName);

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

    history.push({
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
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
        isEditing={true}
      />
    </EuiPageContentBody>
  );
};
