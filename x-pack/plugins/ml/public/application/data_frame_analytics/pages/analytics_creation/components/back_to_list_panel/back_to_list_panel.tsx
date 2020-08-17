/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useNavigateToPath } from '../../../../../contexts/kibana';

export const BackToListPanel: FC = () => {
  const navigateToPath = useNavigateToPath();

  const redirectToAnalyticsManagementPage = async () => {
    await navigateToPath('/data_frame_analytics');
  };

  return (
    <Fragment>
      <EuiCard
        className="dfAnalyticsCreationWizard__card"
        icon={<EuiIcon size="xxl" type="list" />}
        title={i18n.translate('xpack.ml.dataframe.analytics.create.analyticsListCardTitle', {
          defaultMessage: 'Data Frame Analytics',
        })}
        description={i18n.translate(
          'xpack.ml.dataframe.analytics.create.analyticsListCardDescription',
          {
            defaultMessage: 'Return to the analytics management page.',
          }
        )}
        onClick={redirectToAnalyticsManagementPage}
        data-test-subj="analyticsWizardCardManagement"
      />
    </Fragment>
  );
};
