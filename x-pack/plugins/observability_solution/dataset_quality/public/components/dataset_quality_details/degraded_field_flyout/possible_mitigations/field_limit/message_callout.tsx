/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiCallOut, EuiFlexItem } from '@elastic/eui';
import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';
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
    services: { application },
  } = useKibanaContextForPlugin();
  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const onClickHandler = useCallback(async () => {
    await application.navigateToApp(MANAGEMENT_APP_ID, {
      path: `/data/index_management/component_templates/${getComponentTemplatePrefixFromIndexTemplate(
        dataStreamSettings?.indexTemplate ?? name
      )}@custom`,
      openInNewTab: true,
    });
  }, [application, dataStreamSettings?.indexTemplate, name]);

  return (
    <EuiFlexItem grow={false}>
      <EuiCallOut
        title={fieldLimitMitigationSuccessMessage}
        color="success"
        iconType="checkInCircleFilled"
      >
        <EuiButton
          data-test-subj="datasetQualityNewLimitSetCheckComponentTemplate"
          onClick={onClickHandler}
          iconType="popout"
          size="s"
          title={fieldLimitMitigationSuccessComponentTemplateLinkText}
          color="success"
        >
          {fieldLimitMitigationSuccessComponentTemplateLinkText}
        </EuiButton>
      </EuiCallOut>
    </EuiFlexItem>
  );
}

export function ManualRolloverCallout() {
  const { triggerRollover } = useDegradedFields();
  return (
    <EuiFlexItem grow={false}>
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
    </EuiFlexItem>
  );
}
