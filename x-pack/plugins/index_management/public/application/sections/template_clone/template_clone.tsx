/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';

import { TemplateDeserialized } from '../../../../common';
import { TemplateForm, SectionLoading, SectionError, Error } from '../../components';
import { breadcrumbService } from '../../services/breadcrumbs';
import { decodePathFromReactRouter, getTemplateDetailsLink } from '../../services/routing';
import { saveTemplate, useLoadIndexTemplate } from '../../services/api';
import { getIsLegacyFromQueryParams } from '../../lib/index_templates';

interface MatchParams {
  name: string;
}

export const TemplateClone: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
  match: {
    params: { name },
  },
  location,
  history,
}) => {
  const decodedTemplateName = decodePathFromReactRouter(name);
  const isLegacy = getIsLegacyFromQueryParams(location);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const { error: templateToCloneError, data: templateToClone, isLoading } = useLoadIndexTemplate(
    decodedTemplateName,
    isLegacy
  );

  const onSave = async (template: TemplateDeserialized) => {
    setIsSaving(true);
    setSaveError(null);

    const { error } = await saveTemplate(template, true);

    const { name: newTemplateName } = template;

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    history.push(getTemplateDetailsLink(newTemplateName, template._kbnMeta.isLegacy));
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  let content;

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('templateClone');
  }, []);

  if (isLoading) {
    content = (
      <SectionLoading>
        <FormattedMessage
          id="xpack.idxMgmt.templateCreate.loadingTemplateToCloneDescription"
          defaultMessage="Loading template to clone…"
        />
      </SectionLoading>
    );
  } else if (templateToCloneError) {
    content = (
      <SectionError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.templateCreate.loadingTemplateToCloneErrorMessage"
            defaultMessage="Error loading template to clone"
          />
        }
        error={templateToCloneError as Error}
        data-test-subj="sectionError"
      />
    );
  } else if (templateToClone) {
    const templateData = {
      ...templateToClone,
      name: `${decodedTemplateName}-copy`,
    } as TemplateDeserialized;

    content = (
      <TemplateForm
        defaultValue={templateData}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
      />
    );
  }

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            <FormattedMessage
              id="xpack.idxMgmt.createTemplate.cloneTemplatePageTitle"
              defaultMessage="Clone template '{name}'"
              values={{ name: decodedTemplateName }}
            />
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        {content}
      </EuiPageContent>
    </EuiPageBody>
  );
};
