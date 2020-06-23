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

export const ComponentTemplateCreate: React.FunctionComponent<RouteComponentProps> = ({
  history,
}) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);

  // TODO implement
  const onSave = async (template: ComponentTemplateDeserialized) => {
    // const { name } = template;
    // setIsSaving(true);
    // setSaveError(null);
    // const { error } = await saveTemplate(template);
    // setIsSaving(false);
    // if (error) {
    //   setSaveError(error);
    //   return;
    // }
    // history.push(getTemplateDetailsLink(name, template._kbnMeta.isLegacy));
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
          onSave={onSave}
          isSaving={isSaving}
          saveError={saveError}
          clearSaveError={clearSaveError}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
