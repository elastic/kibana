/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { ConnectorTypes, CasesWebhookFieldsType } from '../../../../common/api';
import { ConnectorFieldsProps } from '../types';
import { ConnectorCard } from '../card';

const CasesWebhookComponent: React.FunctionComponent<
  ConnectorFieldsProps<CasesWebhookFieldsType>
> = ({ connector, isEdit = true }) => (
  <>
    {!isEdit && (
      <ConnectorCard
        connectorType={ConnectorTypes.casesWebhook}
        isLoading={false}
        listItems={[]}
        title={connector.name}
        showCommentsWarning={
          !connector.config?.createCommentUrl || !connector.config?.createCommentJson
        }
      />
    )}
  </>
);
CasesWebhookComponent.displayName = 'CasesWebhook';

// eslint-disable-next-line import/no-default-export
export { CasesWebhookComponent as default };
