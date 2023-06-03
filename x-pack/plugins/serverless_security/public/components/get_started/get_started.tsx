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
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { SecurityProductTypes } from '../../../common/config';

interface Props {
  productTypes: SecurityProductTypes;
}

const icons = ['Kibana', 'Kibana', 'Kibana'];

export const GetStartedComponent: React.FC<Props> = ({ productTypes }) => {
  const cardNodes = useMemo(
    () =>
      icons.map(function (item, index) {
        return (
          <EuiFlexItem key={index}>
            <EuiCard icon={<EuiIcon size="xxl" type={`logo${item}`} />} title={`Elastic ${item}`} />
          </EuiFlexItem>
        );
      }),
    []
  );
  return (
    <KibanaPageTemplate restrictWidth={false}>
      <KibanaPageTemplate.Header
        paddingSize="m"
        pageTitle={i18n.translate('xpack.serverlessSecurity.getStarted.title', {
          defaultMessage: `Welcome`,
        })}
        description={
          <>
            <EuiTitle size="xs">
              <h3>
                {i18n.translate('xpack.serverlessSecurity.getStarted.subTitle', {
                  defaultMessage: `Let’s  get started`,
                  values: {
                    productType: productTypes
                      .map((product) => `${product.product_line} ${product.product_tier}`)
                      .join(', '),
                  },
                })}
              </h3>
            </EuiTitle>
            <EuiText size="m">
              {i18n.translate('xpack.serverlessSecurity.getStarted.description', {
                defaultMessage: `Set up your Elastic Security workspace.  Use the toggles below to curate a list of tasks that best fits your environment`,
              })}
            </EuiText>
          </>
        }
      >
        <EuiFlexGroup gutterSize="l">{cardNodes}</EuiFlexGroup>
      </KibanaPageTemplate.Header>
      <KibanaPageTemplate.Section>
        <EuiSpacer size="m" />
      </KibanaPageTemplate.Section>
    </KibanaPageTemplate>
  );
};

export const GetStarted = React.memo(GetStartedComponent);
