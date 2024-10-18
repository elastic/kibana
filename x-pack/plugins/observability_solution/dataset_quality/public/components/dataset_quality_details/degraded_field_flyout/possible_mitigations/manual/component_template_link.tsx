/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { MANAGEMENT_APP_ID } from '@kbn/deeplinks-management/constants';
import { EuiFlexGroup, EuiIcon, EuiLink, EuiPanel, EuiTitle } from '@elastic/eui';
import { useKibanaContextForPlugin } from '../../../../../utils';
import { useDatasetQualityDetailsState } from '../../../../../hooks';
import { getComponentTemplatePrefixFromIndexTemplate } from '../../../../../../common/utils/component_template_name';
import { otherMitigationsCustomComponentTemplate } from '../../../../../../common/translations';

export function CreateEditComponentTemplateLink({ isIntegration }: { isIntegration: boolean }) {
  const {
    services: {
      application,
      share: {
        url: { locators },
      },
    },
  } = useKibanaContextForPlugin();

  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const customComponentTemplateUrl = locators.get('MANAGEMENT_APP_LOCATOR')?.useUrl({
    componentTemplate: `${getComponentTemplatePrefixFromIndexTemplate(
      dataStreamSettings?.indexTemplate ?? name
    )}@custom`,
  });

  const indexTemplateUrl = locators
    .get('MANAGEMENT_APP_LOCATOR')
    ?.useUrl({ indexTemplate: dataStreamSettings?.indexTemplate });

  const componentTemplateUrl = isIntegration ? customComponentTemplateUrl : indexTemplateUrl;

  const onClickHandler = useCallback(async () => {
    await application.navigateToApp(MANAGEMENT_APP_ID, {
      path: componentTemplateUrl,
      openInNewTab: true,
    });
  }, [application, componentTemplateUrl]);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsCustomComponentTemplateLink"
        onClick={onClickHandler}
        target="_blank"
        css={{ width: '100%' }}
      >
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiIcon type="popout" />
          <EuiTitle size="xxs">
            <p>{otherMitigationsCustomComponentTemplate}</p>
          </EuiTitle>
        </EuiFlexGroup>
      </EuiLink>
    </EuiPanel>
  );
}
