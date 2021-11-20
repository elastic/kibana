/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, Fragment } from 'react';
import { EuiCard, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlLink } from '../../../../../contexts/kibana';
import { ML_PAGES } from '../../../../../../../common/constants/locator';

export const BackToListPanel: FC = () => {
  const analyticsManagementPageLink = useMlLink({
    page: ML_PAGES.DATA_FRAME_ANALYTICS_JOBS_MANAGE,
  });

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
        href={analyticsManagementPageLink}
        data-test-subj="analyticsWizardCardManagement"
      />
    </Fragment>
  );
};
