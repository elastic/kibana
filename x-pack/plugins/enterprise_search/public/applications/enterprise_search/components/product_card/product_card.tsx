/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { useValues } from 'kea';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import upperFirst from 'lodash/upperFirst';
// Prefer importing entire lodash library, e.g. import { get } from "lodash"
// eslint-disable-next-line no-restricted-imports
import snakeCase from 'lodash/snakeCase';
import { i18n } from '@kbn/i18n';
import { EuiCard, EuiTextColor } from '@elastic/eui';

import { EuiButton } from '../../../shared/react_router_helpers';
import { sendTelemetry } from '../../../shared/telemetry';
import { HttpLogic } from '../../../shared/http';

import './product_card.scss';

interface IProductCard {
  // Expects product plugin constants (@see common/constants.ts)
  product: {
    ID: string;
    NAME: string;
    CARD_DESCRIPTION: string;
    URL: string;
  };
  image: string;
}

export const ProductCard: React.FC<IProductCard> = ({ product, image }) => {
  const { http } = useValues(HttpLogic);

  return (
    <EuiCard
      className="productCard"
      titleElement="h2"
      title={i18n.translate('xpack.enterpriseSearch.overview.productCard.heading', {
        defaultMessage: `Elastic {productName}`,
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
        <EuiButton
          fill
          to={product.URL}
          shouldNotCreateHref={true}
          onClick={() =>
            sendTelemetry({
              http,
              product: 'enterprise_search',
              action: 'clicked',
              metric: snakeCase(product.ID),
            })
          }
          data-test-subj={`Launch${upperFirst(product.ID)}Button`}
        >
          {i18n.translate('xpack.enterpriseSearch.overview.productCard.button', {
            defaultMessage: `Launch {productName}`,
            values: { productName: product.NAME },
          })}
        </EuiButton>
      }
    />
  );
};
