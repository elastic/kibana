/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import { ConnectorTypes } from '../../../../common/api';
import type { ConnectorFieldsProps } from '../types';
import { ConnectorCard } from '../card';
import * as i18n from './translations';

const CasesWebhookComponent: React.FunctionComponent<ConnectorFieldsProps<null>> = ({
  connector,
  isEdit = true,
}) => (
  <>
    {!isEdit && (
      <>
        <ConnectorCard
          connectorType={ConnectorTypes.casesWebhook}
          isLoading={false}
          listItems={[]}
          title={connector.name}
        />
        <EuiSpacer />
        {(!connector.config?.createCommentUrl || !connector.config?.createCommentJson) && (
          <EuiCallOut title={i18n.CREATE_COMMENT_WARNING_TITLE} color="warning" iconType="help">
            <p>{i18n.CREATE_COMMENT_WARNING_DESC(connector.name)}</p>
          </EuiCallOut>
        )}
      </>
    )}
  </>
);
CasesWebhookComponent.displayName = 'CasesWebhook';

// eslint-disable-next-line import/no-default-export
export { CasesWebhookComponent as default };
