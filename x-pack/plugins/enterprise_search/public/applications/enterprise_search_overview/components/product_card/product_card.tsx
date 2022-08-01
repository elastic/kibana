/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useActions } from 'kea';
import { snakeCase } from 'lodash';

import {
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
  IconType,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';

import { EuiButtonTo, EuiButtonEmptyTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';

import './product_card.scss';

interface ProductResourceLink {
  label: string;
  to: string;
}

export interface ProductCardProps {
  cta: string;
  description: string;
  emptyCta?: boolean;
  features: string[];
  icon: IconType;
  name: string;
  productId: string;
  resourceLinks: ProductResourceLink[];
  url: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  cta,
  description,
  emptyCta = false,
  features,
  icon,
  productId,
  name,
  resourceLinks,
  url,
}) => {
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);

  return (
    <EuiPanel
      hasBorder
      paddingSize="l"
      data-test-subj={`${productId}ProductCard`}
      className="productCard"
    >
      <EuiFlexGroup>
        <EuiFlexItem grow={false} data-test-subj="productCard-icon">
          <EuiIcon size="xl" type={icon} />
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="productCard-details">
          <EuiTitle size="s">
            <h3>{name}</h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiText color="subdued" size="s">
            {description}
          </EuiText>
          <EuiSpacer />
          <div>
            {emptyCta ? (
              <EuiButtonTo
                to={url}
                shouldNotCreateHref
                onClick={() =>
                  sendEnterpriseSearchTelemetry({
                    action: 'clicked',
                    metric: snakeCase(productId),
                  })
                }
              >
                {cta}
              </EuiButtonTo>
            ) : (
              <EuiButtonEmptyTo
                flush="both"
                to={url}
                shouldNotCreateHref
                onClick={() =>
                  sendEnterpriseSearchTelemetry({
                    action: 'clicked',
                    metric: snakeCase(productId),
                  })
                }
              >
                {cta}
              </EuiButtonEmptyTo>
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem data-test-subj="productCard-features">
          <EuiListGroup flush className="productCard-features">
            {features.map((item: string, index: number) => (
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
            {resourceLinks.map((resource, index) => (
              <EuiFlexItem key={index} grow={false}>
                <EuiLink href={resource.to} target="_blank" external>
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
