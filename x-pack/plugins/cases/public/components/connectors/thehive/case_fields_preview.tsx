/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import type { TheHiveFieldsType } from '../../../../common/types/domain';
import { ConnectorTypes } from '../../../../common/types/domain';
import type { ConnectorFieldsPreviewProps } from '../types';
import { ConnectorCard } from '../card';
import * as i18n from './translations';

const TheHiveFieldsPreviewComponent: React.FunctionComponent<
  ConnectorFieldsPreviewProps<TheHiveFieldsType>
> = ({ fields, connector }) => {
  const { tlp } = fields ?? {};

  const mapTLP = (tlp: number | string): string => {
    switch (tlp) {
      case "0":
        return 'CLEAR';
      case "1":
        return 'GREEN';
      case "2":
        return 'AMBER';
      case "3":
        return 'AMBER+STRICT';
      case "4":
        return 'RED';
      default:
        return 'AMBER';
    }
  }

  const listItems = useMemo(
    () => [
      ...(tlp !== null ? [
        {
          title: i18n.TLP_LABEL,
          description: mapTLP(tlp),
        },
      ] : []),
    ],
    [tlp]
  );

  return (
    <ConnectorCard
      connectorType={ConnectorTypes.theHive}
      isLoading={false}
      listItems={listItems}
      title={connector.name}
    />
  );
};

TheHiveFieldsPreviewComponent.displayName = 'TheHiveFieldsPreview';

// eslint-disable-next-line import/no-default-export
export { TheHiveFieldsPreviewComponent as default };
