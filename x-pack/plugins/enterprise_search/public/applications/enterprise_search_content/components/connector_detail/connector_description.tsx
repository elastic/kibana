/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexItem, EuiInlineEditText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Connector } from '@kbn/search-connectors';

import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

export interface ConnectorDescriptionProps {
  connector: Connector;
}

export interface ResolverObject {
  rej: (value: boolean | void | PromiseLike<boolean | void>) => void;
  res: (value: boolean | void | PromiseLike<boolean | void>) => void;
}

let promise: Promise<boolean | void> | undefined;

const getValidationPromiseResolvers = (): ResolverObject => {
  const resolvers = {
    rej: () => {},
    res: () => {},
  };
  promise = new Promise((resolve, reject) => {
    resolvers.res = resolve;
    resolvers.rej = reject;
  });
  return resolvers;
};

export const ConnectorDescription: React.FC<ConnectorDescriptionProps> = ({ connector }) => {
  const [resolverObject, setResolverObject] = useState<ResolverObject>({
    rej: () => {},
    res: () => {},
  });
  const [connectorDescription, setConnectorDescription] = useState<string | null>(
    connector.description
  );
  const { saveNameAndDescription, setConnector } = useActions(ConnectorNameAndDescriptionLogic);
  const { status, isLoading, isFailed, isSuccess } = useValues(ConnectorNameAndDescriptionLogic);

  useEffect(() => {
    setConnector(connector);
  }, [connector]);

  useEffect(() => {
    if (isSuccess) {
      resolverObject.res(true);
    }
    if (isFailed) {
      resolverObject.rej();
    }
  }, [status]);

  return (
    <EuiFlexItem grow={false}>
      <EuiInlineEditText
        isLoading={isLoading}
        inputAriaLabel={i18n.translate(
          'xpack.enterpriseSearch.content.connectors.nameAndDescription.description.ariaLabel',
          { defaultMessage: 'Edit connector description' }
        )}
        placeholder={i18n.translate(
          'xpack.enterpriseSearch.content.connectors.nameAndDescription.description.placeholder',
          { defaultMessage: 'Add a description' }
        )}
        value={connectorDescription || ''}
        onSave={(inputValue) => {
          setConnectorDescription(inputValue);
          saveNameAndDescription({ description: inputValue, name: connector.name });
          setResolverObject(getValidationPromiseResolvers());
          return promise;
        }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          setConnectorDescription(event.target.value);
        }}
        onCancel={(previousValue) => {
          setConnectorDescription(previousValue);
        }}
      />
    </EuiFlexItem>
  );
};
