/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButtonEmpty } from '@elastic/eui';
import React, { FC } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useMlLocator, useNavigateToPath } from '../../../contexts/kibana';
import { ML_PAGES } from '../../../../../common/constants/locator';

export const JobsActionMenu: FC = () => {
  const navigateToPath = useNavigateToPath();
  const mlLocator = useMlLocator();

  const onClick = async () => {
    if (!mlLocator) return;
    const path = await mlLocator.getUrl({
      page: ML_PAGES.SETTINGS,
    });
    navigateToPath(path);
  };

  return (
    <EuiButtonEmpty onClick={onClick} iconType="gear">
      <FormattedMessage id="xpack.ml.navMenu.settingsTabLinkText" defaultMessage="Settings" />
    </EuiButtonEmpty>
  );
};
