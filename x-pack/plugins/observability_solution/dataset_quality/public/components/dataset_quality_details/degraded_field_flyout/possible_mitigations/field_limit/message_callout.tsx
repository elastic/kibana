/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton, EuiCallOut, EuiLink } from '@elastic/eui';
import {
  fieldLimitMitigationFailedMessage,
  fieldLimitMitigationFailedMessageDescription,
  fieldLimitMitigationRolloverButton,
  fieldLimitMitigationSuccessComponentTemplateLinkText,
  fieldLimitMitigationSuccessMessage,
} from '../../../../../../common/translations';
import { useDatasetQualityDetailsState, useDegradedFields } from '../../../../../hooks';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../../../common/utils/component_template_name';
import { useKibanaContextForPlugin } from '../../../../../utils';

export function MessageCallout() {
  const { isSavingNewFieldLimitInProgress, newFieldLimitResult } = useDegradedFields();
  const { isComponentTemplateUpdated, isLatestBackingIndexUpdated } = newFieldLimitResult ?? {};
  const isSuccess = Boolean(isComponentTemplateUpdated) && Boolean(isLatestBackingIndexUpdated);
  const isPartialSuccess =
    Boolean(isComponentTemplateUpdated) && !Boolean(isLatestBackingIndexUpdated);

  if (!isSavingNewFieldLimitInProgress && isSuccess) {
    return <SuccessCallout />;
  }

  if (!isSavingNewFieldLimitInProgress && isPartialSuccess) {
    return <ManualRolloverCallout />;
  }

  return null;
}

export function SuccessCallout() {
  const {
    services: {
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();
  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const componentTemplateUrl = locators.get('MANAGEMENT_APP_LOCATOR')?.useUrl({
    componentTemplate: `${getComponentTemplatePrefixFromIndexTemplate(
      dataStreamSettings?.indexTemplate ?? name
    )}@custom`,
  });

  return (
    <EuiCallOut
      title={fieldLimitMitigationSuccessMessage}
      color="success"
      iconType="checkInCircleFilled"
    >
      <EuiLink
        data-test-subj="datasetQualityNewLimitSetCheckComponentTemplate"
        href={componentTemplateUrl}
        target="_blank"
        color="success"
      >
        {fieldLimitMitigationSuccessComponentTemplateLinkText}
      </EuiLink>
    </EuiCallOut>
  );
}

export function ManualRolloverCallout() {
  const { triggerRollover } = useDegradedFields();
  return (
    <EuiCallOut
      title={fieldLimitMitigationFailedMessage}
      color="danger"
      iconType="checkInCircleFilled"
    >
      <p>{fieldLimitMitigationFailedMessageDescription}</p>
      <EuiButton
        data-test-subj="datasetQualityNewLimitSetManualRollover"
        onClick={triggerRollover}
        iconType="popout"
        size="s"
        title={fieldLimitMitigationRolloverButton}
        color="danger"
      >
        {fieldLimitMitigationRolloverButton}
      </EuiButton>
    </EuiCallOut>
  );
}
