/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useEffect, useState } from 'react';
import { RouteComponentProps } from 'react-router-dom';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPageBody, EuiPageContent, EuiSpacer, EuiTitle } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { parse } from 'query-string';

import { TemplateForm } from '../../components';
import { breadcrumbService } from '../../services/breadcrumbs';
import { TemplateDeserialized } from '../../../../common';
import { saveTemplate } from '../../services/api';
import { getTemplateDetailsLink } from '../../services/routing';

export const TemplateCreate: React.FunctionComponent<RouteComponentProps> = ({ history }) => {
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<any>(null);
  const search = parse(useLocation().search.substring(1));
  const isLegacy = Boolean(search.legacy);

  const onSave = async (template: TemplateDeserialized) => {
    const { name } = template;

    setIsSaving(true);
    setSaveError(null);

    const { error } = await saveTemplate(template);

    setIsSaving(false);

    if (error) {
      setSaveError(error);
      return;
    }

    history.push(getTemplateDetailsLink(name, template._kbnMeta.isLegacy));
  };

  const clearSaveError = () => {
    setSaveError(null);
  };

  useEffect(() => {
    breadcrumbService.setBreadcrumbs('templateCreate');
  }, []);

  return (
    <EuiPageBody>
      <EuiPageContent>
        <EuiTitle size="l">
          <h1 data-test-subj="pageTitle">
            {isLegacy ? (
              <FormattedMessage
                id="xpack.idxMgmt.createTemplate.createLegacyTemplatePageTitle"
                defaultMessage="Create legacy template"
              />
            ) : (
              <FormattedMessage
                id="xpack.idxMgmt.createTemplate.createTemplatePageTitle"
                defaultMessage="Create template"
              />
            )}
          </h1>
        </EuiTitle>
        <EuiSpacer size="l" />
        <TemplateForm
          onSave={onSave}
          isSaving={isSaving}
          saveError={saveError}
          clearSaveError={clearSaveError}
          isLegacy={isLegacy}
        />
      </EuiPageContent>
    </EuiPageBody>
  );
};
