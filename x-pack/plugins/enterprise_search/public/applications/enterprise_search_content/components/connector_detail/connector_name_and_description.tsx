/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { ChangeEvent, useEffect, useState } from 'react';

import { useActions, useValues } from 'kea';

import { EuiFlexGroup, EuiFlexItem, EuiInlineEditText, EuiInlineEditTitle } from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Connector } from '@kbn/search-connectors';

import { ConnectorNameAndDescriptionLogic } from './connector_name_and_description_logic';

export interface ConnectorNameAndDescriptionProps {
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

export const ConnectorNameAndDescription: React.FC<ConnectorNameAndDescriptionProps> = ({
  connector,
}) => {
  const [resolverObject, setResolverObject] = useState<ResolverObject>({
    rej: () => {},
    res: () => {},
  });
  const [connectorName, setConnectorName] = useState<string>(connector.name);
  const [connectorDescription, setConnectorDescription] = useState<string | null>(
    connector.description
  );
  const [nameErrors, setNameErrors] = useState<string[]>([]);
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
    <EuiFlexGroup direction="column" gutterSize="xs">
      <EuiFlexItem grow={false}>
        <EuiInlineEditTitle
          heading="h1"
          inputAriaLabel={i18n.translate(
            'xpack.enterpriseSearch.content.connectors.nameAndDescription.name.ariaLabel',
            { defaultMessage: 'Edit connector name' }
          )}
          placeholder={i18n.translate(
            'xpack.enterpriseSearch.content.connectors.nameAndDescription.name.placeholder',
            { defaultMessage: 'Add a name to your connector' }
          )}
          value={connectorName}
          isLoading={isLoading}
          isInvalid={nameErrors.length > 0}
          size="m"
          editModeProps={{
            formRowProps: { error: nameErrors },
            cancelButtonProps: { onClick: () => setNameErrors([]) },
            inputProps: { readOnly: isLoading },
          }}
          onSave={(inputValue) => {
            if (inputValue.trim().length <= 0) {
              setNameErrors([
                i18n.translate(
                  'xpack.enterpriseSearch.content.nameAndDescription.name.error.empty',
                  { defaultMessage: 'Connector name cannot be empty' }
                ),
              ]);
              return false;
            }
            setConnectorName(inputValue);
            saveNameAndDescription({ description: connectorDescription, name: inputValue });
            setResolverObject(getValidationPromiseResolvers());
            return promise;
          }}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            setConnectorName(event.target.value);
          }}
          onCancel={(previousValue) => {
            setConnectorName(previousValue);
          }}
        />
      </EuiFlexItem>
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
            saveNameAndDescription({ description: inputValue, name: connectorName });
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
    </EuiFlexGroup>
  );
};
