/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ComponentTemplateDeserialized } from '../shared_imports';
import { ComponentTemplateForm } from '../shared';
import { useComponentTemplatesContext } from '../component_templates_context';

interface Props {
  /**
   * This value may be passed in to prepopulate the creation form (e.g., to clone a template)
   */
  sourceComponentTemplate?: any;
}

export const ComponentTemplateCreate: React.FunctionComponent<RouteComponentProps & Props> = ({
  history,
  sourceComponentTemplate,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  const { api } = useComponentTemplatesContext();

  const onSave = async (componentTemplate: ComponentTemplateDeserialized) => {
    const { name } = componentTemplate;

    setIsSaving(true);
    setSaveError(null);

    const { error } = await api.createComponentTemplate(componentTemplate);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    history.push(`/component_templates/${encodeURIComponent(name)}`);
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  // TODO implement breadcrumb
  // useEffect(() => {
  //   breadcrumbService.setBreadcrumbs('templateCreate');
  // }, []);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.createComponentTemplate.pageTitle"
              defaultMessage="Create component template"
            />
          </h1>
        </EuiTitle>

        <EuiSpacer size="l" />

        <ComponentTemplateForm
          defaultValue={sourceComponentTemplate}
          onSave={onSave}
          isSaving={isSaving}
          saveError={saveError}
          clearSaveError={clearSaveError}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
