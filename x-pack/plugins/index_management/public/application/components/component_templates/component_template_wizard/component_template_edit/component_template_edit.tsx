/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiTitle, EuiSpacer, EuiCallOut } from '@elastic/eui';

import { useComponentTemplatesContext } from '../../component_templates_context';
import { ComponentTemplateDeserialized, SectionLoading } from '../../shared_imports';
import { attemptToDecodeURI } from '../../lib';
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

  const decodedName = attemptToDecodeURI(name);

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
      pathname: encodeURI(`/component_templates/${encodeURIComponent(name)}`),
    });
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  let content;

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.componentTemplateEdit.loadingDescription"
          defaultMessage="Loading component template…"
        />
      </SectionLoading>
    );
  } else if (error) {
    content = (
      <>
        <EuiCallOut
          title={
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateEdit.loadComponentTemplateError"
              defaultMessage="Error loading component template"
            />
          }
          color="danger"
          iconType="alert"
          data-test-subj="loadComponentTemplateError"
        >
          <div>{error.message}</div>
        </EuiCallOut>
        <EuiSpacer size="m" />
      </>
    );
  } else if (componentTemplate) {
    content = (
      <ComponentTemplateForm
        defaultValue={componentTemplate}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
        isEditing={true}
      />
    );
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.componentTemplateEdit.editPageTitle"
              defaultMessage="Edit component template '{name}'"
              values={{ name: decodedName }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};
