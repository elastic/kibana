/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { memo } from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { SecurityPageName } from '../../../common/constants';
import { SpyRoute } from '../../common/utils/route/spy_routes';

interface NoPermissionProps {
  dataTestSubj: string;
  titleInfo: { id: string; defaultMessage: string };
  bodyInfo: { id: string; defaultMessage: string };
  pageName: SecurityPageName;
}
export const NoPermissions = memo(
  ({ dataTestSubj, titleInfo, bodyInfo, pageName }: NoPermissionProps) => {
    return (
      <>
        <EuiEmptyPrompt
          iconType="alert"
          iconColor="danger"
          titleSize="l"
          data-test-subj={dataTestSubj}
          title={<FormattedMessage id={titleInfo.id} defaultMessage={titleInfo.defaultMessage} />}
          body={
            <EuiText color="subdued">
              <FormattedMessage id={bodyInfo.id} defaultMessage={bodyInfo.defaultMessage} />
            </EuiText>
          }
        />
        <SpyRoute pageName={pageName} />
      </>
    );
  }
);

NoPermissions.displayName = 'NoPermissions';
