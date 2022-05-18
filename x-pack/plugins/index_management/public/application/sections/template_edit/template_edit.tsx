/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, Fragment } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiPageContentBody, EuiSpacer, EuiCallOut } from '@elastic/eui';
import { ScopedHistory } from '@kbn/core/public';

import { TemplateDeserialized } from '../../../../common';
import { PageError, PageLoading, attemptToURIDecode, Error } from '../../../shared_imports';
import { breadcrumbService } from '../../services/breadcrumbs';
import { useLoadIndexTemplate, updateTemplate } from '../../services/api';
import { getTemplateDetailsLink } from '../../services/routing';
import { TemplateForm } from '../../components';
import { getIsLegacyFromQueryParams } from '../../lib/index_templates';

interface MatchParams {
  name: string;
}

export const TemplateEdit: React.FunctionComponent<RouteComponentProps<MatchParams>> = ({
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

  const { error, data: template, isLoading } = useLoadIndexTemplate(decodedTemplateName, isLegacy);

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('templateEdit');
  }, []);

  const onSave = async (updatedTemplate: TemplateDeserialized) => {
    setIsSaving(true);
    setSaveError(null);

    const { error: saveErrorObject } = await updateTemplate(updatedTemplate);

    setIsSaving(false);

    if (saveErrorObject) {
      setSaveError(saveErrorObject);
      return;
    }

    history.push(getTemplateDetailsLink(decodedTemplateName, updatedTemplate._kbnMeta.isLegacy));
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  let isSystemTemplate;

  if (isLoading) {
    return (
      <PageLoading>
        <FormattedMessage
          id="xpack.idxMgmt.templateEdit.loadingIndexTemplateDescription"
          defaultMessage="Loading template…"
        />
      </PageLoading>
    );
  } else if (error) {
    return (
      <PageError
        title={
          <FormattedMessage
            id="xpack.idxMgmt.templateEdit.loadingIndexTemplateErrorMessage"
            defaultMessage="Error loading template"
          />
        }
        error={error}
        data-test-subj="sectionError"
      />
    );
  } else if (template) {
    const {
      name: templateName,
      _kbnMeta: { type },
    } = template;

    isSystemTemplate = templateName && templateName.startsWith('.');

    if (type === 'cloudManaged') {
      return (
        <PageError
          title={
            <FormattedMessage
              id="xpack.idxMgmt.templateEdit.managedTemplateWarningTitle"
              defaultMessage="Editing a managed template is not permitted"
            />
          }
          error={
            {
              message: i18n.translate(
                'xpack.idxMgmt.templateEdit.managedTemplateWarningDescription',
                {
                  defaultMessage: 'Managed templates are critical for internal operations.',
                }
              ),
            } as Error
          }
          data-test-subj="systemTemplateEditCallout"
        />
      );
    }
  }

  return (
    <EuiPageContentBody restrictWidth style={{ width: '100%' }}>
      {isSystemTemplate && (
        <Fragment>
          <EuiCallOut
            title={
              <FormattedMessage
                id="xpack.idxMgmt.templateEdit.systemTemplateWarningTitle"
                defaultMessage="Editing a system template can break Kibana"
              />
            }
            color="danger"
            iconType="alert"
            data-test-subj="systemTemplateEditCallout"
          >
            <FormattedMessage
              id="xpack.idxMgmt.templateEdit.systemTemplateWarningDescription"
              defaultMessage="System templates are critical for internal operations."
            />
          </EuiCallOut>
          <EuiSpacer size="l" />
        </Fragment>
      )}

      <TemplateForm
        title={
          <FormattedMessage
            id="xpack.idxMgmt.editTemplate.editTemplatePageTitle"
            defaultMessage="Edit template '{name}'"
            values={{ name: decodedTemplateName }}
          />
        }
        defaultValue={template!}
        onSave={onSave}
        isSaving={isSaving}
        saveError={saveError}
        clearSaveError={clearSaveError}
        isEditing={true}
        isLegacy={isLegacy}
        history={history as ScopedHistory}
      />
    </EuiPageContentBody>
  );
};
