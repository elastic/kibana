/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContentBody, EuiSpacer, EuiPageHeader } from '@elastic/eui';

import { ComponentTemplateDeserialized } from '../../shared_imports';
import { useComponentTemplatesContext } from '../../component_templates_context';
import { ComponentTemplateForm } from '../component_template_form';

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

  const { api, breadcrumbs } = useComponentTemplatesContext();

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

    history.push({
      pathname: encodeURI(`/component_templates/${encodeURIComponent(name)}`),
    });
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  useEffect(() => {
    breadcrumbs.setCreateBreadcrumbs();
  }, [breadcrumbs]);

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <EuiPageHeader
        pageTitle={
          <span data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.createComponentTemplate.pageTitle"
              defaultMessage="Create component template"
            />
          </span>
        }
        bottomBorder
      />

      <EuiSpacer size="l" />

      <ComponentTemplateForm
        defaultValue={sourceComponentTemplate}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
      />
    </EuiPageContentBody>
  );
};
