/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC, Fragment } from 'react';
import { EuiCard, EuiHorizontalRule, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useMlKibana } from '../../../../../contexts/kibana';

export const BackToListPanel: FC = () => {
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();

  const redirectToAnalyticsManagementPage = async () => {
    await navigateToUrl('#/data_frame_analytics?');
  };

  return (
    <Fragment>
      <EuiHorizontalRule />
      <EuiCard
        // @ts-ignore
        style={{ width: '300px' }}
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
