/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiCard,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPageHeader,
  EuiSpacer,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface Props {}

const icons = ['Kibana', 'Kibana', 'Kibana'];

export const GetStartedComponent: React.FC<Props> = ({}) => {
  const cardNodes = useMemo(
    () =>
      icons.map(function (item, index) {
        return (
          <EuiFlexItem key={index}>
            <EuiCard
              icon={<EuiIcon size="xxl" type={`logo${item}`} />}
              title={`Elastic ${item}`}
              isDisabled={item === 'Kibana' ? true : false}
            />
          </EuiFlexItem>
        );
      }),
    []
  );
  return (
    <>
      <EuiPageHeader
        paddingSize="m"
        pageTitle={i18n.translate('xpack.serverlessSecurity.getStarted.title', {
          defaultMessage: `Welcome`,
        })}
        description={i18n.translate('xpack.serverlessSecurity.getStarted.description', {
          defaultMessage: `Set up your Elastic Security workspace.  Use the toggles below to curate a list of tasks that best fits your environment`,
        })}
      />
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="l">{cardNodes}</EuiFlexGroup>
    </>
  );
};

export const GetStarted = React.memo(GetStartedComponent);
