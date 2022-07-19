/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';
import { snakeCase } from 'lodash';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiListGroup,
  EuiListGroupItem,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';
import { KibanaLogic } from '../../../shared/kibana';
import { TelemetryLogic } from '../../../shared/telemetry';

import './product_card.scss';

interface ProductResourceLink {
  label: string;
  to: string;
}

interface ProductCardProps {
  // Expects product plugin constants (@see common/constants.ts)
  product: {
    ID: string;
    NAME: string;
    CARD_DESCRIPTION: string;
    URL: string;
    ICON: string;
    RESOURCE_LINKS: ProductResourceLink[];
    PRODUCT_CARD_CTA: string;
  };
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const { config } = useValues(KibanaLogic);

  return (
    <EuiPanel hasBorder paddingSize="l">
      <EuiFlexGroup>
        <EuiFlexItem grow={false} data-test-subj="productCard-icon">
          <EuiIcon size="xl" type={product.ICON} />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="productCard-details">
          <EuiTitle size="s">
            <h3>{product.NAME}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {product.CARD_DESCRIPTION}
          </EuiText>
          <EuiSpacer />
          <div>
            {product.NAME.toLowerCase() === 'elasticsearch' ? (
              <EuiButtonTo
                to={product.URL}
                shouldNotCreateHref
                onClick={() =>
                  sendEnterpriseSearchTelemetry({
                    action: 'clicked',
                    metric: snakeCase(product.ID),
                  })
                }
              >
                {product.PRODUCT_CARD_CTA}
              </EuiButtonTo>
            ) : (
              <EuiButtonEmptyTo
                flush="both"
                to={product.URL}
                shouldNotCreateHref
                onClick={() =>
                  sendEnterpriseSearchTelemetry({
                    action: 'clicked',
                    metric: snakeCase(product.ID),
                  })
                }
              >
                {product.PRODUCT_CARD_CTA}
              </EuiButtonEmptyTo>
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="productCard-features">
          <EuiListGroup flush style={{ paddingTop: '1.5rem' }}>
            {product.FEATURES.map((item, index) => (
              <EuiListGroupItem
                key={index}
                size="s"
                label={item}
                icon={<EuiIcon color="success" type="checkInCircleFilled" />}
              />
            ))}
          </EuiListGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h4 data-test-subj="productCard-resources">
              {i18n.translate('xpack.enterpriseSearch.productCard.resourcesTitle', {
                defaultMessage: 'Resources',
              })}
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup
            direction="column"
            gutterSize="m"
            data-test-subj="productCard-resourceLinks"
          >
            {product.RESOURCE_LINKS.map((resource, index) => (
              <EuiFlexItem key={index} grow={false}>
                <EuiLink href={resource.to} external>
                  {resource.label}
                </EuiLink>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
