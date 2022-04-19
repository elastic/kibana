/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useValues, useActions } from 'kea';
import { snakeCase } from 'lodash';

import { EuiCard, EuiTextColor } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { KibanaLogic } from '../../../shared/kibana';
import { EuiButtonTo } from '../../../shared/react_router_helpers';
import { TelemetryLogic } from '../../../shared/telemetry';

import './product_card.scss';

interface ProductCardProps {
  // Expects product plugin constants (@see common/constants.ts)
 product: {
    ID: string;
    NAME: string;
    CARD_DESCRIPTION: string;
    URL: string;
  };
  image: string;
  url?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, image, url }) => {
  const { sendEnterpriseSearchTelemetry } = useActions(TelemetryLogic);
  const { config } = useValues(KibanaLogic);

  const LAUNCH_BUTTON_TEXT = i18n.translate(
    'xpack.enterpriseSearch.overview.productCard.launchButton',
    {
      defaultMessage: 'Open {productName}',
      values: { productName: product.NAME },
    }
  );

  const SETUP_BUTTON_TEXT = i18n.translate(
    'xpack.enterpriseSearch.overview.productCard.setupButton',
    {
      defaultMessage: 'Set up {productName}',
      values: { productName: product.NAME },
    }
  );

  return (
    <EuiCard
      className="productCard"
      titleElement="h2"
      title={i18n.translate('xpack.enterpriseSearch.overview.productCard.heading', {
        defaultMessage: 'Elastic {productName}',
        values: { productName: product.NAME },
      })}
      image={
        <div className="productCard__imageContainer">
          <img src={image} className="productCard__image" alt="" role="presentation" />
        </div>
      }
      paddingSize="l"
      description={<EuiTextColor color="subdued">{product.CARD_DESCRIPTION}</EuiTextColor>}
      footer={
        <EuiButtonTo
          fill
          to={url || product.URL}
          shouldNotCreateHref
          onClick={() =>
            sendEnterpriseSearchTelemetry({
              action: 'clicked',
              metric: snakeCase(product.ID),
            })
          }
        >
          {config.host ? LAUNCH_BUTTON_TEXT : SETUP_BUTTON_TEXT}
        </EuiButtonTo>
      }
      data-test-subj={`${product.ID}ProductCard`}
    />
  );
};
