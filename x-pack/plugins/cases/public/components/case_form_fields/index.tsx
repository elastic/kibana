/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { useFormContext } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import type { EuiThemeComputed } from '@elastic/eui';
import { logicalCSS, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { Title } from '../create/title';
import { Tags } from '../create/tags';
import { Category } from '../create/category';
import { Severity } from '../create/severity';
import { Description } from '../create/description';
import { useCasesFeatures } from '../../common/use_cases_features';
import { Assignees } from '../create/assignees';
import { CustomFields } from '../create/custom_fields';
import { SyncAlertsToggle } from '../create/sync_alerts_toggle';

const containerCss = (euiTheme: EuiThemeComputed<{}>, big?: boolean) =>
  big
    ? css`
        ${logicalCSS('margin-top', euiTheme.size.xl)};
      `
    : css`
        ${logicalCSS('margin-top', euiTheme.size.base)};
      `;

const CaseFormFieldsComponent: React.FC = () => {
  const { isSubmitting } = useFormContext();
  const { caseAssignmentAuthorized, isSyncAlertsEnabled } = useCasesFeatures();
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <Title isLoading={isSubmitting} path="caseFields.title" />
      {caseAssignmentAuthorized ? (
        <div css={containerCss(euiTheme)}>
          <Assignees isLoading={isSubmitting} path="caseFields.assignees" />
        </div>
      ) : null}
      <div css={containerCss(euiTheme)}>
        <Tags isLoading={isSubmitting} path="caseFields.tags" />
      </div>
      <div css={containerCss(euiTheme)}>
        <Category isLoading={isSubmitting} path="caseFields.category" />
      </div>
      <div css={containerCss(euiTheme)}>
        <Severity isLoading={isSubmitting} path="caseFields.severity" />
      </div>
      <div css={containerCss(euiTheme, true)}>
        <Description isLoading={isSubmitting} draftStorageKey={''} path="caseFields.description" />
      </div>
      {isSyncAlertsEnabled ? (
        <div>
          <SyncAlertsToggle isLoading={isSubmitting} path="caseFields.syncAlerts" />
        </div>
      ) : null}
      <div css={containerCss(euiTheme)}>
        <CustomFields
          isLoading={isSubmitting}
          path="caseFields.customFields"
          setAsOptional={true}
        />
      </div>
      <div />
    </>
  );
};

CaseFormFieldsComponent.displayName = 'CaseFormFields';

export const CaseFormFields = memo(CaseFormFieldsComponent);
