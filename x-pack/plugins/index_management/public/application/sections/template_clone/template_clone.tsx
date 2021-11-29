/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContentBody } from '@elastic/eui';
import { ScopedHistory } from 'kibana/public';

import { PageLoading, PageError, Error } from '../../../shared_imports';
import { TemplateDeserialized } from '../../../../common';
import { TemplateForm } from '../../components';
import { breadcrumbService } from '../../services/breadcrumbs';
import { getTemplateDetailsLink } from '../../services/routing';
import { saveTemplate, useLoadIndexTemplate } from '../../services/api';
import { getIsLegacyFromQueryParams } from '../../lib/index_templates';
import { attemptToURIDecode } from '../../../shared_imports';

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
  const decodedTemplateName = attemptToURIDecode(name)!;
  const isLegacy = getIsLegacyFromQueryParams(location);

  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const {
    error: templateToCloneError,
    data: templateToClone,
    isLoading,
  } = useLoadIndexTemplate(decodedTemplateName, isLegacy);

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

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('templateClone');
  }, []);

  if (isLoading) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.templateCreate.loadingTemplateToCloneDescription"
          defaultMessage="Loading template to clone…"
        />
      </PageLoading>
    );
  } else if (templateToCloneError) {
    return (
      <PageError
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
  }

  const templateData = {
    ...templateToClone,
    name: `${decodedTemplateName}-copy`,
  } as TemplateDeserialized;

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      <TemplateForm
        title={
          <FormattedMessage
            id="xpack.idxMgmt.createTemplate.cloneTemplatePageTitle"
            defaultMessage="Clone template '{name}'"
            values={{ name: decodedTemplateName }}
          />
        }
        defaultValue={templateData}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
        isLegacy={isLegacy}
        history={history as ScopedHistory}
      />
    </EuiPageContentBody>
  );
};
