/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
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

  const [indexTemplatePath, setIndexTemplatePath] = useState<string | null>(null);
  const [componentTemplatePath, setComponentTemplatePath] = useState<string | null>(null);

  const { dataStreamSettings, datasetDetails } = useDatasetQualityDetailsState();
  const { name } = datasetDetails;

  const indexManagementLocator = locators.get('INDEX_MANAGEMENT_LOCATOR_ID');

  useEffect(() => {
    indexManagementLocator
      ?.getLocation({
        page: 'index_template',
        indexTemplate: dataStreamSettings?.indexTemplate ?? '',
      })
      .then(({ path }) => setIndexTemplatePath(path));
    indexManagementLocator
      ?.getLocation({
        page: 'component_template',
        componentTemplate: `${getComponentTemplatePrefixFromIndexTemplate(
          dataStreamSettings?.indexTemplate ?? name
        )}@custom`,
      })
      .then(({ path }) => setComponentTemplatePath(path));
  }, [
    locators,
    setIndexTemplatePath,
    dataStreamSettings?.indexTemplate,
    indexManagementLocator,
    name,
  ]);

  const templateUrl = isIntegration ? componentTemplatePath : indexTemplatePath;

  const onClickHandler = useCallback(async () => {
    const options = {
      openInNewTab: true,
      ...(templateUrl && { path: templateUrl }),
    };

    await application.navigateToApp(MANAGEMENT_APP_ID, options);
  }, [application, templateUrl]);

  return (
    <EuiPanel hasBorder grow={false}>
      <EuiLink
        data-test-subj="datasetQualityManualMitigationsCustomComponentTemplateLink"
        data-test-url={templateUrl}
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
