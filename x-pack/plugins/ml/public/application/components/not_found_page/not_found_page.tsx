/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FormattedMessage } from '@kbn/i18n-react';
import React, { FC } from 'react';
import { EuiButton, EuiCallOut } from '@elastic/eui';
import { useLocation } from 'react-router-dom';
import { ML_PAGES } from '../../../../common/constants/locator';
import { useMlLink } from '../../contexts/kibana';
import { MlPageHeader } from '../page_header';

export const NotFoundPage: FC = () => {
  const { pathname } = useLocation();
  const overviewUrl = useMlLink({
    page: ML_PAGES.OVERVIEW,
  });

  return (
    <>
      <MlPageHeader>
        <FormattedMessage id="xpack.ml.notFoundPage.title" defaultMessage="Page Not Found" />
      </MlPageHeader>
      <EuiCallOut
        color="warning"
        iconType="iInCircle"
        title={
          <FormattedMessage
            id="xpack.ml.notFoundPage.bannerTitle"
            defaultMessage="ML application doesn't recognize this route: {route}."
            values={{
              route: pathname,
            }}
          />
        }
      >
        <p>
          <EuiButton href={overviewUrl} color={'warning'}>
            <FormattedMessage
              id="xpack.ml.notFoundPage.bannerText"
              defaultMessage="Open the Overview page"
            />
          </EuiButton>
        </p>
      </EuiCallOut>
    </>
  );
};
